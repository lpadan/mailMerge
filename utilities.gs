function testRunTime(timesRun=0) {
    // ran on 11/9/2021 and ran for 30 minutes
    if (timesRun > 0) console.log(`ran ${timesRun} times`);
    Utilities.sleep(30000);
    testRunTime(timesRun + 1);
}

function getId(Url) {
    var id = Url.match(/[-\w]{25,}/); // returns any regex "word" (a-z, 0-9) plus "-" that is at least 25 characters, uninterrupted.  should be the id
    if (!id) {
        return;
    }
    return id[0]; // match returns an array.  select zeroth element
}

function include(filename) {

    return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function formatDisplaySheet(sheet) {
    sheet.clear();
    sheet.getRange("A:Z").setFontSize(11);

    sheet.setRowHeight(1,43);
    sheet.getRange("A1:I1").setFontSize(13).setVerticalAlignment('middle').setFontColor('white').setBackgroundColor('#4285f4');
    sheet.getRange("A1:I1").mergeAcross().setHorizontalAlignment('left');
    sheet.getRange("A1").setValue('    M A I L   M E R G E');

    sheet.setRowHeight(2,30);
    var values = ['column 1','column 2','column 3','column 4','column 5','column 6','column 7','pdf created','email sent'];
    sheet.getRange("A2:I2").setValues([values]);
    sheet.getRange("A2:G2").setFontColor('white').setBackgroundColor('black').setFontSize(12).setHorizontalAlignment('center').setVerticalAlignment('middle');
    sheet.getRange("H2:I2").setFontColor('white').setBackgroundColor('#26a69a').setFontSize(12).setHorizontalAlignment('center').setVerticalAlignment('middle');

    var columnWidths = [175,175,175,175,175,175,175,175,175];
    for (var i = 0; i < columnWidths.length;i++) {
        sheet.setColumnWidth(i+1,columnWidths[i]);
    }
}

function deleteUserProperties () {
    var userProperties = PropertiesService.getUserProperties();
    userProperties.deleteAllProperties();
}

function deleteDocumentProperties() {
    var documentProperties = PropertiesService.getDocumentProperties();
    documentProperties.deleteAllProperties();
}

