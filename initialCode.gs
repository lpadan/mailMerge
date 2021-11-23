function onInstall(e) {

  onOpen(e);
}

function onOpen(e) {
	// add-on code
	// ui = SpreadsheetApp.getUi();
	// ui.createAddonMenu()
	// .addItem("Open Sidebar",'openSidebar')
	// .addToUi();

	// container bound code
	ui = SpreadsheetApp.getUi();
	ui.createMenu('Mail Merge')
	.addItem("Open Sidebar",'openSidebar')
	.addToUi();
}