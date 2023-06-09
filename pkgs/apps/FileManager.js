export default {
  name: "File Manager",
  description:
    "Browse, import, and manage files through this beautiful and simplistic file manager.",
  privileges: [
    {
      privilege: "startPkg",
      description: "Run applications from files",
    },
  ],
  ver: 0.1, // Compatible with core 0.1
  type: "process",
  exec: async function (Root) {
    let win;

    console.log("Hello from example package", Root.Lib);

    function onEnd() {
      console.log("Example process ended, attempting clean up...");
      const result = Root.Lib.cleanup(Root.PID, Root.Token);
      if (result === true) {
        win.close();
        console.log("Cleanup Success! Token:", Root.Token);
      } else {
        console.log("Cleanup Failure. Token:", Root.Token);
      }
    }

    const L = Root.Lib;
    const C = Root.Core;

    console.log("Core!!!", C);

    const vfs = await L.loadLibrary("VirtualFS");
    const Sidebar = await L.loadComponent("Sidebar");
    const Win = (await L.loadLibrary("WindowSystem")).win;
    const FileMappings = await L.loadLibrary("FileMappings");

    win = new Win({
      title: "Files",
      // onclose: () => {
      // },
    });

    const setTitle = (t) =>
      (win.window.querySelector(".win-titlebar .title").innerText = t);

    let wrapper = win.window.querySelector(".win-content");

    wrapper.classList.add("row", "o-h", "h-100", "with-sidebar");

    let path = "Root";

    Sidebar.new(wrapper, [
      {
        onclick: (_) => {
          if (path === "Root") return;

          let p = vfs.getParentFolder(path);
          path = p;
          renderFileList(p);
        },
        html: L.icons.folderUp,
      },
      {
        onclick: async (_) => {
          let result = await Root.Modal.input(
            "Input",
            "New folder name",
            "New folder"
          );
        },
        html: L.icons.createFolder,
      },
      {
        onclick: async (_) => {
          let result = await Root.Modal.input(
            "Input",
            "New file name",
            "New file"
          );
        },
        html: L.icons.createFile,
      },
      {
        onclick: (_) => {
          var input = new Root.Lib.html("input").elm;
          input.type = "file";

          input.onchange = (e) => {
            // getting a hold of the file reference
            var file = e.target.files[0];
            var reader = new FileReader();

            if (
              file.type.startsWith("text") ||
              file.type.startsWith("application")
            ) {
              // read as text
              reader.readAsText(file, "UTF-8");

              // here we tell the reader what to do when it's done reading...
              reader.onload = (readerEvent) => {
                var content = readerEvent.target.result; // this is the content!
                console.log(content);
                console.log(file);
                vfs.writeFile(`Root/${file.name}`, content);
              };
            } else if (
              file.type.startsWith("image") ||
              file.type.startsWith("audio") ||
              file.type.startsWith("video")
            ) {
              // read as arraybuffer; store as base64
              reader.readAsDataURL(file);

              // here we tell the reader what to do when it's done reading...
              reader.onload = (readerEvent) => {
                var content = readerEvent.target.result; // this is the content!
                console.log(content);
                console.log(file);
                vfs.writeFile(`Root/${file.name}`, content);
              };
            }
          };

          input.click();
        },
        html: L.icons.fileImport,
      },
      {
        onclick: async (_) => {
          if (!selectedItem) return;
          let i = vfs.whatIs(selectedItem);
          let result = await Root.Modal.prompt(
            "Notice",
            `Are you sure you want to delete this ${
              i === "dir" ? "folder" : "file"
            }?`
          );
          if (result === true) {
            vfs.delete(selectedItem);
          }
        },
        html: L.icons.delete,
      },
    ]);

    const wrapperWrapper = new L.html("div")
      .class("col", "w-100", "ovh")
      .appendTo(wrapper);
    const wrapperWrapperWrapper = new L.html("div")
      .class("fg", "w-100")
      .appendTo(wrapperWrapper);

    const table = new L.html("table")
      .class("w-100")
      .appendTo(wrapperWrapperWrapper);

    vfs.importFS();

    let selectedItem = "";

    let tableHead = new L.html("thead").appendTo(table);
    let tableHeadRow = new L.html("tr").appendTo(tableHead);
    new L.html("th").attr({ colspan: 2 }).text("Name").appendTo(tableHeadRow);
    new L.html("th").text("Type").appendTo(tableHeadRow);

    let tableBody = new L.html("tbody").appendTo(table);

    function renderFileList(folder) {
      const isFolder = vfs.whatIs(folder);

      if (isFolder !== "dir") {
        path = "Root/";
        return renderFileList();
      }
      // return renderFileList(vfs.getParentFolder(folder));

      setTitle("Files - " + folder);
      let fileList = vfs.list(folder);

      tableBody.html("");

      for (let i = 0; i < fileList.length; i++) {
        let file = fileList[i];
        let tableBodyRow = new L.html("tr").appendTo(tableBody);

        let mapping = FileMappings.retriveAllMIMEdata(
          path + "/" + file.item,
          vfs
        );

        tableBodyRow.on("click", async (_) => {
          if (selectedItem === path + "/" + file.item) {
            console.log("open selected item");
            if (file.type === "dir") {
              selectedItem = path + "/" + file.item;
              path = selectedItem;
              renderFileList(path);
            } else {
              mapping.onClick(Root.Core);
            }

            return;
          }
          selectedItem = path + "/" + file.item;
          renderFileList(path);
        });

        if (file === null) continue;

        if (selectedItem === path + "/" + file.item)
          tableBodyRow.class("table-selected");

        let userFriendlyFileType = "File";

        switch (file.type) {
          case "dir":
            userFriendlyFileType = "File folder";
            break;
          case "file":
            userFriendlyFileType = mapping.fullname || mapping.label;
            break;
        }

        new L.html("td")
          .style({ width: "24px", height: "24px" })
          .append(
            new Root.Lib.html("div")
              .html(Root.Lib.icons[mapping.icon])
              .style({ width: "24px" })
          )
          .appendTo(tableBodyRow);
        new L.html("td").text(file.item).appendTo(tableBodyRow);
        new L.html("td").text(userFriendlyFileType).appendTo(tableBodyRow);
      }
    }

    renderFileList(path);

    return L.setupReturns(onEnd, (m) => {
      if (
        typeof m === "object" &&
        m.type &&
        m.type === "loadFolder" &&
        m.path
      ) {
        path = m.path;
        renderFileList(m.path);
      }
    });
  },
};
