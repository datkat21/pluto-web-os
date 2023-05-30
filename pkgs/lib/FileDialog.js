let L = {};
let C = {};

export default {
  name: "File Dialog Library",
  description: "Create file dialogs to pick and select files",
  ver: 0.1, // Compatible with core 0.1
  type: "library",
  init: (l, c) => {
    L = l;
    C = c;
  },
  data: {
    pickFile: (path) => {
      if (path === undefined || path === "") path = "Root";
      return new Promise(async (resolve, reject) => {
        const vfs = await L.loadLibrary("VirtualFS");
        const Win = (await L.loadLibrary("WindowSystem")).win;
        const FileMappings = await L.loadLibrary("FileMappings");
        const Sidebar = await L.loadComponent("Sidebar");

        let win = new Win({
          title: "File Dialog",
          content: "",
          width: 450,
          height: 360,
          onclose: () => {
            resolve(false);
          },
        });

        const setTitle = (t) =>
          (win.window.querySelector(".win-titlebar .title").innerText = t);

        let wrapper = win.window.querySelector(".win-content");

        wrapper.classList.add("row", "o-h", "h-100", "with-sidebar");

        Sidebar.new(wrapper, [
          {
            onclick: (_) => {
              let p = vfs.getParentFolder(path);
              path = p;
              renderFileList(p);
            },
            html: L.icons.folderUp,
          },
        ]);

        let isClosing = false;

        const wrapperWrapper = new L.html("div")
          .class("col", "w-100", "ovh")
          .appendTo(wrapper);
        const wrapperWrapperWrapper = new L.html("div")
          .class("fg", "w-100", "ovh")
          .appendTo(wrapperWrapper);

        const attemptClose = async (_) => {
          if (!isClosing) {
            isClosing = true;
            await win.close();
          }
        };

        const table = new L.html("table")
          .class("w-100", "ovh")
          .appendTo(wrapperWrapperWrapper);
        const buttonRow = new L.html("div")
          .class("row")
          .appendTo(wrapperWrapper);

        let confirmButton = new L.html("button")
          .class("primary")
          .text("Confirm")
          .style({ "margin-left": "auto" })
          .attr({ disabled: true })
          .on("click", async (_) => {
            await attemptClose();
            return resolve(selectedItem);
          });
        let cancelButton = new L.html("button")
          .text("Cancel")
          .on("click", async (_) => {
            await attemptClose();
            resolve(false);
          });

        buttonRow.appendMany(confirmButton, cancelButton);

        vfs.importFS();

        let selectedItem = "";

        let tableHead = new L.html("thead").appendTo(table);
        let tableHeadRow = new L.html("tr").appendTo(tableHead);
        new L.html("th")
          .attr({ colspan: 2 })
          .text("Name")
          .appendTo(tableHeadRow);
        new L.html("th").text("Type").appendTo(tableHeadRow);

        let tableBody = new L.html("tbody").appendTo(table);

        function renderFileList(folder) {
          const isFolder = vfs.whatIs(folder);

          if (isFolder !== "dir") {
            path = "Root/Desktop";
            return renderFileList();
          }

          // return renderFileList(vfs.getParentFolder(folder));

          setTitle("File picker - " + folder);
          let fileList = vfs.list(folder);

          tableBody.html("");

          for (let i = 0; i < fileList.length; i++) {
            let file = fileList[i];
            let tableBodyRow = new L.html("tr").appendTo(tableBody);
            tableBodyRow.on("click", async (_) => {
              if (selectedItem === path + "/" + file.item) {
                if (file.type === "dir") {
                  selectedItem = path + "/" + file.item;
                  confirmButton.attr({ disabled: "" });
                  path = selectedItem;
                  renderFileList(path);
                } else {
                  selectedItem = path + "/" + file.item;
                  await attemptClose();
                  return resolve(selectedItem);
                }

                return;
              }
              selectedItem = path + "/" + file.item;
              if (file.type === "file") {
                confirmButton.attr({ disabled: null });
              }
              if (file.type === "dir") {
                confirmButton.attr({ disabled: "" });
              }
              renderFileList(path);
            });
            let mapping = FileMappings.retriveAllMIMEdata(
              path + "/" + file.item,
              vfs
            );

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
                new L.html("div")
                  .html(L.icons[mapping.icon])
                  .style({ width: "24px" })
              )
              .appendTo(tableBodyRow);
            new L.html("td").text(file.item).appendTo(tableBodyRow);
            new L.html("td").text(userFriendlyFileType).appendTo(tableBodyRow);
          }
        }

        renderFileList(path);
      });
    },
    saveFile: (path) => {
      if (path === undefined || path === "") path = "Root";
      return new Promise(async (resolve, reject) => {
        const vfs = await L.loadLibrary("VirtualFS");
        const Win = (await L.loadLibrary("WindowSystem")).win;
        const FileMappings = await L.loadLibrary("FileMappings");
        const Sidebar = await L.loadComponent("Sidebar");

        let win = new Win({
          title: "File Dialog",
          content: "",
          width: 450,
          height: 360,
          onclose: () => {
            resolve(false);
          },
        });

        const setTitle = (t) =>
          (win.window.querySelector(".win-titlebar .title").innerText = t);

        let wrapper = win.window.querySelector(".win-content");

        wrapper.classList.add("row", "o-h", "h-100", "with-sidebar");

        Sidebar.new(wrapper, [
          {
            onclick: (_) => {
              let p = vfs.getParentFolder(path);
              path = p;
              renderFileList(p);
            },
            html: L.icons.folderUp,
          },
        ]);

        let isClosing = false;

        const wrapperWrapper = new L.html("div")
          .class("col", "w-100")
          .appendTo(wrapper);
        const wrapperWrapperWrapper = new L.html("div")
          .class("fg", "w-100")
          .appendTo(wrapperWrapper);

        const attemptClose = async (_) => {
          if (!isClosing) {
            isClosing = true;
            await win.close();
          }
        };

        const table = new L.html("table")
          .class("w-100")
          .appendTo(wrapperWrapperWrapper);
        const buttonRow = new L.html("div")
          .class("row")
          .appendTo(wrapperWrapper);

        let pathInput = new L.html("input")
          .class("fg")
          .attr({ placeholder: "Path", value: "Root/" })
          .on("keyup", async (e) => {
            let toBeSavedItem = e.target.value;
            if (!toBeSavedItem.startsWith("Root/")) e.target.value = "Root/";
            setSelectedItem(toBeSavedItem);
          });
        pathInput.elm.focus();
        pathInput.elm.select();

        let confirmButton = new L.html("button")
          .class("primary")
          .text("Confirm")
          .attr({ disabled: true })
          .on("click", async (_) => {
            await attemptClose();
            return resolve(selectedItem);
          });
        let cancelButton = new L.html("button")
          .text("Cancel")
          .on("click", async (_) => {
            await attemptClose();
            resolve(false);
          });

        buttonRow.appendMany(pathInput, confirmButton, cancelButton);

        vfs.importFS();

        let selectedItem = "";

        function setSelectedItem(newPath) {
          selectedItem = newPath;
          pathInput.val(newPath);
          confirmButton.attr({ disabled: newPath === "" ? "" : null });
        }
        let tableHead = new L.html("thead").appendTo(table);
        let tableHeadRow = new L.html("tr").appendTo(tableHead);
        new L.html("th").text("Name").appendTo(tableHeadRow);
        new L.html("th").text("Type").appendTo(tableHeadRow);

        let tableBody = new L.html("tbody").appendTo(table);

        function renderFileList(folder) {
          const isFolder = vfs.whatIs(folder);

          if (isFolder !== "dir") {
            path = "Root/Desktop";
            return renderFileList();
          }

          setTitle("File picker - " + folder);
          let fileList = vfs.list(folder);

          tableBody.html("");

          for (let i = 0; i < fileList.length; i++) {
            let file = fileList[i];
            let tableBodyRow = new L.html("tr").appendTo(tableBody);
            tableBodyRow.on("click", async (_) => {
              if (selectedItem === path + "/" + file.item) {
                if (file.type === "dir") {
                  selectedItem = path + "/" + file.item;
                  setSelectedItem(selectedItem);
                  confirmButton.attr({ disabled: "" });
                  path = selectedItem;
                  renderFileList(path);
                } else {
                  selectedItem = path + "/" + file.item;
                  setSelectedItem(selectedItem);
                  await attemptClose();
                  return resolve(selectedItem);
                }

                return;
              }
              selectedItem = path + "/" + file.item;
              setSelectedItem(selectedItem);
              if (file.type === "file") {
                confirmButton.attr({ disabled: null });
              }
              if (file.type === "dir") {
                confirmButton.attr({ disabled: "" });
              }
              renderFileList(path);
            });

            let mapping = FileMappings.retriveAllMIMEdata(
              path + "/" + file.item,
              vfs
            );

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
                new L.html("div")
                  .html(L.icons[mapping.icon])
                  .style({ width: "24px" })
              )
              .appendTo(tableBodyRow);
            new L.html("td").text(file.item).appendTo(tableBodyRow);
            new L.html("td").text(userFriendlyFileType).appendTo(tableBodyRow);
          }
        }

        renderFileList(path);
      });
    },
  },
};