function onOpen(e) {
	ui = SpreadsheetApp.getUi();
	ui.createMenu('Mail Merge')
	.addItem("Create PDF And Send",'createAndSend')
	.addSeparator()
	.addItem('Send Test Email','sendTestEmail')
	.addItem("Help",'help')
	.addToUi();
}