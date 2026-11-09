document.addEventListener("submit", (event) => {
  const button = event.submitter;
  if (!(button instanceof HTMLButtonElement)) return;
  queueMicrotask(() => {
    button.disabled = true;
    button.dataset.pending = "";
  });
});

window.addEventListener("pageshow", () => {
  for (const button of document.querySelectorAll("button[data-pending]")) {
    button.disabled = false;
    delete button.dataset.pending;
  }
});
