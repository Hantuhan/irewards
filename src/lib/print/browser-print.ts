const PRINT_BODY_CLASS = "irewards-printing";

export function printElement(elementId: string) {
  const el = document.getElementById(elementId);
  if (!el) return;
  document.body.classList.add(PRINT_BODY_CLASS);
  document.body.dataset.printTarget = elementId;
  window.print();
  window.setTimeout(() => {
    document.body.classList.remove(PRINT_BODY_CLASS);
    delete document.body.dataset.printTarget;
  }, 500);
}

export function printHtmlDocument(html: string, title = "Print") {
  const win = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.document.title = title;
  win.focus();
  win.addEventListener("load", () => {
    win.print();
  });
  if (win.document.readyState === "complete") {
    win.print();
  }
}
