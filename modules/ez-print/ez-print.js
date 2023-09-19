function addButton(app, html) {
  const link = $(`<a title="Print"><i class="fas fa-print"></i></a>`);
  link.on("click", evt => {
    $(".ez-print").removeClass("ez-print");
    html.addClass("ez-print");
    window.print();
  });

  html.find(".window-title").after(link);
}

Hooks.on("renderActorSheet", addButton);
Hooks.on("renderJournalSheet", addButton);
Hooks.on("renderItemSheet", addButton);
