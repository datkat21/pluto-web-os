(async () => {
  try {
    const knownLibraries = [];
    const GlobalLib = {
      html: class Html {
        constructor(e) {
          this.elm = document.createElement(e || "div");
        }
        text(val) {
          this.elm.innerText = val;
          return this;
        }
        html(val) {
          this.elm.innerHTML = val;
          return this;
        }
        cleanup() {
          this.elm.remove();
        }
        query(selector) {
          return this.elm.querySelector(selector);
        }
        class(...val) {
          for (let i = 0; i < val.length; i++) {
            this.elm.classList.toggle(val[i]);
          }
          return this;
        }
        classOn(...val) {
          for (let i = 0; i < val.length; i++) {
            this.elm.classList.add(val[i]);
          }
          return this;
        }
        classOff(...val) {
          for (let i = 0; i < val.length; i++) {
            this.elm.classList.remove(val[i]);
          }
          return this;
        }
        style(obj) {
          for (const key of Object.keys(obj)) {
            this.elm.style.setProperty(key, obj[key]);
          }
          return this;
        }
        on(ev, cb) {
          this.elm.addEventListener(ev, cb);
          return this;
        }
        un(ev, cb) {
          this.elm.removeEventListener(ev, cb);
          return this;
        }
        appendTo(parent) {
          if (parent instanceof HTMLElement) {
            parent.appendChild(this.elm);
          } else if (parent instanceof Html) {
            parent.elm.appendChild(this.elm);
          } else if (typeof parent === "string") {
            document.querySelector(parent).appendChild(this.elm);
          }
          return this;
        }
        append(elem) {
          if (elem instanceof HTMLElement) {
            this.elm.appendChild(elem);
          } else if (elem instanceof Html) {
            this.elm.appendChild(elem.elm);
          } else if (typeof elem === "string") {
            const newElem = document.createElement(elem);
            this.elm.appendChild(newElem);
            return new Html(newElem);
          }
          return this;
        }
        appendMany(...elements) {
          for (const elem of elements) {
            this.append(elem);
          }
          return this;
        }
        clear() {
          this.elm.innerHTML = "";
          return this;
        }
        attr(obj) {
          for (let key in obj) {
            if (obj[key] !== null) this.elm.setAttribute(key, obj[key]);
            else this.elm.removeAttribute(key);
          }
          return this;
        }
        val(str) {
          this.elm.value = str;
        }
      },
      loadLibrary: async function (lib) {
        if (lib.includes(":")) return false;
        knownLibraries.push(lib);
        return await Core.startPkg("lib:" + lib);
      },
      loadComponent: async (cmp) => {
        if (cmp.includes(":")) return false;
        knownLibraries.push(cmp);
        return await Core.startPkg("components:" + cmp);
      },
    };

    GlobalLib.icons = await fetch("/assets/icons.json")
      .then((j) => j.json())
      .catch((r) => undefined);

    // Similar name to procLib but is not actually ProcLib
    const processLib = class ProcessAvailableLibrary {
      constructor(url, pid, token) {
        var Url = url;
        var Pid = pid;
        var Token = token;

        this.html = GlobalLib.html;
        this.icons = GlobalLib.icons;

        this.launch = async (app, parent = "body") => {
          if (
            (await Modal.prompt(
              "App Start",
              `${Core.processList[Pid].proc.name} wants to launch ${app
                .split(":")
                .pop()}.\nConfirm or deny?`,
              parent
            )) === true
          ) {
            return await Core.startPkg(app);
          } else {
            // await Modal.alert("Cancelled.");
            return false;
          }
        };
        this.getProcessList = (_) =>
          Core.processList
            .filter((m) => m !== null)
            .map((m) => {
              return {
                name: m.name,
                pid: m.pid,
              };
            });
        this.loadLibrary = async (lib) => {
          if (lib.includes(":")) return false;
          return await Core.startPkg("lib:" + lib);
        };
        this.loadComponent = async (cmp) => {
          if (cmp.includes(":")) return false;
          return await Core.startPkg("components:" + cmp);
        };
        this.setupReturns = function (onEnd, onMessage) {
          // the idea is a standardized .proc on processes
          return {
            end: onEnd,
            send: onMessage,
          };
        };
        this.cleanup = function (pid, token) {
          // Token is required for the pid to verify that it is the one willing to clean up
          console.log("Checking..");
          const proc = Core.processList
            .filter((p) => p !== null)
            .findIndex((p) => p.pid === pid && p.token === token);
          if (proc !== -1) {
            console.log(Core.processList[proc]);
            ProcLib.cleanupProcess(pid);
            return true;
          } else {
            return false;
          }
        };
      }
    };

    const ProcLib = {
      findEmptyPID: function () {
        let r = Core.processList.findIndex((p) => p === null);
        return r !== -1 ? r : Core.processList.length;
      },
      cleanupProcess: function (pid) {
        let proc = Core.processList
          .filter((p) => p !== null)
          .find((p) => p.pid === pid);
        console.group("Process cleanup (" + pid, proc.name + ")");
        console.debug(
          `%cProcess ${proc.name} (${proc.pid}) was ended.`,
          "color:green;font-weight:bold"
        );
        Core.processList[pid] = null;
        console.groupEnd();
      },
      randomString: (_) => crypto.randomUUID(),
    };

    let Modal;

    const corePrivileges = {
      startPkg: { description: "Start other applications" },
      processList: { description: "View and control other processes" },
      knownPackageList: { description: "Know installed packages" },
      services: { description: "Interact with system services" },
      full: {
        description:
          '<span style="color:var(--negative-light);">Full system access</span>',
      },
    };

    const Core = {
      version: 0.1,
      processList: [],
      knownPackageList: [],
      startPkg: async function (url, isUrl = true, force = false) {
        try {
          // This should be safe as startPkg can only be called by admin packages and trusted libraries
          let pkg;
          if (isUrl === false) {
            // treat this package as a raw uri
            pkg = await import(url);
            url = "none:<Imported as URI>";
            // e.g. data:text/javascript;base64,jiOAJIOFAWFJOJAWOj
          } else {
            pkg = await import("/pkgs/" + url.replace(":", "/") + ".js");
          }

          if (!pkg.default)
            throw new Error('No "default" specified in package');
          pkg = pkg.default;

          Core.knownPackageList.push({ url, pkg });

          // system:BootLoader
          if (pkg.name && pkg.type === "process" && pkg.ver <= Core.version) {
            console.group("Running " + url);
            console.log(
              `Core version: ${Core.version}\nPackage version: ${pkg.ver}`
            );
            // Matching Core version and type is set
            console.log("Good package data");

            // Check if this package is a process and call exec
            if (pkg.type === "process" && typeof pkg.exec === "function") {
              const PID = ProcLib.findEmptyPID();

              // console.log(pkg.exec.toString());
              Core.processList[PID] = {
                name: url,
                pid: PID,
                proc: null,
              };
              const Token = ProcLib.randomString();
              const newLib = new processLib(url, PID, Token);
              if (Core.processList[PID]) Core.processList[PID].token = Token;
              let result;
              console.log(pkg.privileges);
              if (
                url.startsWith("system:") ||
                url.startsWith("ui:") ||
                url.startsWith("components:") ||
                url.startsWith("services:")
              ) {
                result = await pkg.exec({
                  Lib: newLib,
                  Core,
                  PID,
                  Token,
                  Modal,
                  Services: Core.services,
                });
              } else if (
                pkg.privileges === undefined ||
                pkg.privileges === false
              ) {
                result = await pkg.exec({
                  Lib: newLib,
                  Core: null,
                  PID,
                  Token,
                  Modal,
                  Services: Core.services,
                });
              } else {
                let privileges = {};

                if (!Array.isArray(pkg.privileges)) {
                  throw new Error("pkg.privileges must be an array");
                }

                for (const item of pkg.privileges) {
                  if (!item || typeof item !== "object" || !item.privilege)
                    continue;

                  if (item.privilege in corePrivileges) {
                    privileges[item.privilege] = corePrivileges[item.privilege];
                    if (!item.description) continue;
                    privileges[item.privilege].authorNote = item.description;
                  }
                }

                let modalResult = "";
                if (force === false)
                  modalResult = await new Promise((resolve, reject) => {
                    Modal.modal(
                      "App Access Control",
                      "App " +
                        url.split(":").pop() +
                        ` wants to launch privileged:<br><br><ul>${Object.keys(
                          privileges
                        )
                          .map(
                            (m) =>
                              `<li>${privileges[m].description}<br>${
                                privileges[m].authorNote !== undefined
                                  ? `Author note: ${privileges[m].authorNote}</li>`
                                  : '<span style="color:var(--negative-light)">No author note</span>'
                              }`
                          )
                          .join("")}</ul>`,
                      "body",
                      false,
                      {
                        text: "Allow",
                        type: "primary",
                        callback: (_) => resolve("allow"),
                      },
                      {
                        text: "Deny",
                        callback: (_) => resolve("deny"),
                      },
                      {
                        text: "Cancel",
                        callback: (_) => resolve(false),
                      }
                    );
                  });
                else modalResult = "allow";
                if (modalResult === "allow") {
                  let coreObj = {
                    ...(privileges.startPkg ? { startPkg: Core.startPkg } : {}),
                    ...(privileges.processList
                      ? { processList: Core.processList }
                      : {}),
                    ...(privileges.knownPackageList
                      ? { knownPackageList: Core.knownPackageList }
                      : {}),
                    ...(privileges.services
                      ? { services: Core.services }
                      : {}),
                  };
                  if (privileges.full) {
                    coreObj = Core;
                  }
                  result = await pkg.exec({
                    Lib: newLib,
                    Core: coreObj,
                    PID,
                    Token,
                    Modal,
                    Services: Core.services,
                  });
                  console.log("ran with privs");
                } else if (modalResult === "deny") {
                  result = await pkg.exec({
                    Lib: newLib,
                    Core: null,
                    PID,
                    Token,
                    Modal,
                    Services: Core.services,
                  });
                  console.log("ran without privs");
                } else {
                  result = null;
                }
              }

              if (
                Core.processList[PID] &&
                typeof Core.processList[PID]["proc"] !== "undefined"
              ) {
                Core.processList[PID].proc = Object.assign(
                  { name: pkg?.name, description: pkg?.description },
                  result
                );
              }
              console.groupEnd();
              return Core.processList[PID];
            }
          } else if (pkg.type === "library" || pkg.type === "component") {
            if (pkg.data && typeof pkg.data === "object") {
              if (pkg.init && typeof pkg.init === "function") {
                await pkg.init(GlobalLib, Core);
              }

              return pkg.data;
            }
          } else {
            console.log(pkg);
            throw new Error(
              "Bad package metadata" +
                (pkg.ver !== undefined && typeof pkg.ver === "number"
                  ? ` - maybe version "${pkg.ver}" doesn\'t match your current version of "${Core.version}"?`
                  : "")
            );
          }
        } catch (e) {
          const s = `Failed to load package ${url}. ${e}\n\n${e.stack}`;
          if (Modal && Modal.alert) {
            Modal.alert(s);
          } else {
            alert(s);
          }
        }
      },
      services: {},
    };

    Modal = await Core.startPkg("ui:Modal");

    await Core.startPkg("system:BootLoader");

    console.log(Modal);

    window.c = Core;
    window.l = GlobalLib;
    window.h = GlobalLib.html;
  } catch (e) {
    alert(e);
  }
})();
