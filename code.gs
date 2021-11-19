
function createAndSend(test=0) {
    var data,emailAddress,emailBody,emailSentIndex,headers,i,index,emailIindexj,pdfFile,pdfFiles,pdfCreatedIndex,sheet,emailSuccess,pdfSuccess,replace,re;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    // var sheet = ss.getSheetByName('Config');
    // if (!sheet) {
    //     Browser.msgBox('The "Config" tab was not found');
    //     return;
    // }
    // var docFileId = getId(sheet.getRange('B1').getValue());
    // var pdfFolderId = getId(sheet.getRange('B2').getValue());
    // var tempFolderId = getId(sheet.getRange('B3').getValue());
    // var pdfName = sheet.getRange('B4').getValue();
    // var emailSubject = sheet.getRange('B5').getValue();
    // var emailBodyHTML = sheet.getRange('B6').getValue();

    // var docFile = DriveApp.getFileById(docFileId);
    // var tempFolder = DriveApp.getFolderById(tempFolderId);
    // var pdfFolder = DriveApp.getFolderById(pdfFolderId);

    if (test) {
        sheet = ss.getSheetByName("[Mail Merge - Test]");
        if (!sheet) {
            Browser.msgBox('The "[Mail Merge - Test]" tab was not found');
            return;
        }
        sheet.activate();
    }
    else {
        sheet = ss.getSheetByName("[Mail Merge - Data]");
        if (!sheet) {
            Browser.msgBox('The "[Mail Merge - Data]" tab was not found');
            return;
        }
        sheet.activate();
    }
    data = sheet.getDataRange().getValues();
    headers = data.shift();
    emailIndex = headers.indexOf('email');
    pdfCreatedIndex = headers.indexOf('pdf created');
    emailSentIndex = headers.indexOf('email sent');

    for (i = 0; i < data.length; i++) {

        pdfSuccess = 0;
        emailSuccess = 0;

        if (data[i][pdfCreatedIndex] && data[i][emailSentIndex]) continue;

        var tempFile = docFile.makeCopy(tempFolder);
        var tempDocFile = DocumentApp.openById(tempFile.getId());
        var body = tempDocFile.getBody();
        for (j = 0; j < headers.length; j++) {

            body.replaceText("{" + headers[j] + "}", data[i][j]); // does a global replace automatically
            pdfName = pdfName.replace("{" + headers[j] + "}", data[i][j]);
        }

        tempDocFile.saveAndClose();
        var pdfContentBlob = tempFile.getAs(MimeType.PDF);

        if (!data[i][pdfCreatedIndex]) {

            try {
              pdfFile = pdfFolder.createFile(pdfContentBlob).setName(pdfName);
              sheet.getRange(i+2,pdfCreatedIndex+1).setValue('yes');
              pdfSuccess = 1;
            } catch (error) {
              sheet.getRange(i+2,pdfCreatedIndex+1).setValue(error);
              sheet.getRange(i+2,emailSentIndex+1).setValue('no');
              pdfSuccess = 0;
              sheet.getRange(i+2,1,1,headers.length).setBackground("#ffcccc"); // red
              continue;
            }
        }

        if (!data[i][emailSentIndex]) {

            if (!data[i][emailIndex]) { // no email address
                emailSuccess = 0;
                sheet.getRange(i+2,emailSentIndex+1).setValue('no email address');
            } else {
                emailAddress = data[i][emailIndex];
                emailBody = emailBodyHTML;

                for (j = 0; j < headers.length; j++) {
                    replace = "{" + headers[j] + "}";
                    re = new RegExp(replace,"g"); // global replace
                    emailBody = emailBody.replace(re,data[i][j]);
                }

                try{
                    if (!pdfFile) {
                        pdfFiles = pdfFolder.getFilesByName(pdfName);
                        while (pdfFiles.hasNext()) {
                          var pdfFile = pdfFiles.next();
                          break;
                        }
                        pdfSuccess = 1;
                    }
                    MailApp.sendEmail(emailAddress,emailSubject,null, {
                      attachments: [pdfFile],
                      htmlBody: emailBody
                  });
                  sheet.getRange(i+2,emailSentIndex+1).setValue('yes');
                  emailSuccess = 1;
                } catch (error) {
                  sheet.getRange(i+2,emailSentIndex+1).setValue(error);
                  emailSuccess = 0;
                  sheet.getRange(i+2,1,1,headers.length).setBackground("#ffcccc"); // red
                }
            }
        }

        if (pdfSuccess && emailSuccess) {
            sheet.getRange(i+2,1,1,headers.length).setBackground("#e6ffe6"); // green
        } else {
           sheet.getRange(i+2,1,1,headers.length).setBackground("#ffcccc"); // red
        }

        tempFolder.removeFile(tempFile);
    }
}

function sendTestEmail() {

    createAndSend(test=1);
}

function help() {
    var html = HtmlService.createTemplateFromFile('help');
    html = html.evaluate().setWidth(750).setHeight(700);
    SpreadsheetApp.getUi().showModalDialog(html, ' Mail Merge - Help');
}

function openSidebar() {
    ui = SpreadsheetApp.getUi();
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (!ss.getSheetByName('[Mail Merge - Data]')) {
        var response = ui.alert('Could not find sheet named "[Mail Merge - Data]"\nCreate sheet?', ui.ButtonSet.YES_NO);
        if (response == ui.Button.NO) {
            return;
        }
        ss.insertSheet('[Mail Merge - Data]');
        var dataSheet = ss.getSheetByName('[Mail Merge - Data]');
        dataSheet.setRowHeight(1,25);
        dataSheet.getRange('A1').setBackground('#4285f4').setValue('').setFontSize(12);
        dataSheet.getRange('B1:C1').setBackground('#26a69a').setFontColor('white').setValues([['pdf created','email sent']]).setFontSize(12);
        dataSheet.setColumnWidths(1,3,200).activate();
    }

    if (!ss.getSheetByName('[Mail Merge - Test]')) {
        var response = ui.alert('Could not find sheet named "[Mail Merge - Test]"\nCreate sheet?', ui.ButtonSet.YES_NO);
        if (response == ui.Button.NO) {
            return;
        }
        ss.insertSheet('[Mail Merge - Test]');
        var dataSheet = ss.getSheetByName('[Mail Merge - Test]');
        dataSheet.setRowHeight(1,25);
        dataSheet.getRange('A1').setBackground('#4285f4').setValue('').setFontSize(12);
        dataSheet.getRange('B1:C1').setBackground('#26a69a').setFontColor('white').setValues([['pdf created','email sent']]).setFontSize(12);
        dataSheet.setColumnWidths(1,3,200).activate();
    }

    var data = {};
    var sheet = ss.getSheetByName('[Mail Merge - Data]').activate();

    var userProperties = PropertiesService.getUserProperties();
    data.documentTemplateUrl = userProperties.getProperty('documentTemplateUrl');
    data.pdfFolderUrl = userProperties.getProperty('pdfFolderUrl');
    data.tempFolderUrl = userProperties.getProperty('tempFolderUrl');
    data.pdfFileName = userProperties.getProperty('pdfFileName');
    data.emailToColName = userProperties.getProperty('emailToColName');
    data.emailSubject = userProperties.getProperty('emailSubject');
    data.emailBodyHtml = userProperties.getProperty('emailBodyHtml');
    data.emailBodyText = userProperties.getProperty('emailBodyText');

    var html = HtmlService.createTemplateFromFile('sidebar');
    html.data = data;
    html = html.evaluate();
    html.setTitle("Mail Merge");
    SpreadsheetApp.getUi().showSidebar(html);
}

function saveDocumentTemplateUrl(url) {
    // verify that the URL is a valid drive URL
    var data = {};
    var fileId = getId(url);
    if (!fileId) {
        data.success = false;
        data.errorMessage = "Invalid URL";
        return data;
    }
    try {
        DriveApp.getFileById(fileId);
    } catch(e){
        data.success = false;
        data.errorMessage = "Template Document not found";
        return data;
    }
    var userProperties = PropertiesService.getUserProperties();
    userProperties.setProperty('documentTemplateUrl',url.trim());
    data.success = true;
    data.url = url;
    return data;
}

function savePdfFolderUrl(url) {
    // verify that the URL is a valid drive URL
    var data = {};
    var folderId = getId(url);
    if (!folderId) {
        data.success = false;
        data.errorMessage = "Invalid URL";
        return data;
    }
    try {
        DriveApp.getFolderById(folderId);
    } catch(e){
        data.success = false;
        data.errorMessage = "PDF Folder not found";
        return data;
    }
    var userProperties = PropertiesService.getUserProperties();
    userProperties.setProperty('pdfFolderUrl',url.trim());
    data.success = true;
    data.url = url;
    return data;
}

function saveTempFolderUrl(url) {
    // verify that the URL is a valid drive URL
    var data = {};
    var folderId = getId(url);
    if (!folderId) {
        data.success = false;
        data.errorMessage = "Invalid URL";
        return data;
    }
    try {
        DriveApp.getFolderById(folderId);
    } catch(e){
        data.success = false;
        data.errorMessage = ("Temp Folder not found");
        return data;
    }
    var userProperties = PropertiesService.getUserProperties();
    userProperties.setProperty('tempFolderUrl',url.trim());
    data.success = true;
    data.url = url;
    return data;
}

function savePdfFileName(fileName) {
    var data = {};
    var userProperties = PropertiesService.getUserProperties();
    userProperties.setProperty('pdfFileName',fileName.trim());
    data.success = true;
    data.fileName = fileName;
    return data;
}

function saveEmailToColName(colName) {
    var data = {};
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('[Mail Merge - Data]');
    var headers = sheet.getDataRange().offset(0,0,1).getValues()[0]; // 1D array
    if (!headers.includes(colName)) {
        data.success = false;
        data.errorMessage = "Column name not found";
        return data;
    }
    var userProperties = PropertiesService.getUserProperties();
    userProperties.setProperty('emailToColName',colName.trim());
    data.success = true;
    data.colName = colName;
    return data;
}

function saveEmailSubject(subject) {
    var data = {};
    var userProperties = PropertiesService.getUserProperties();
    userProperties.setProperty('emailSubject',subject.trim());
    data.success = true;
    data.subject = subject;
    return data;
}

function saveEmailBody(data) {
    var userProperties = PropertiesService.getUserProperties();

    if (data.type == 'html') {
        userProperties.setProperty('emailBodyText','');
        userProperties.setProperty('emailBodyHtml',data.emailBody.trim());
    } else if (data.type == 'text') {
        userProperties.setProperty('emailBodyHtml','');
        userProperties.setProperty('emailBodyText',data.emailBody.trim());
    }
    data.success = true;
    return data;
}

function getEmailTypes(data) {
    var userProperties = PropertiesService.getUserProperties();
    data.emailBodyHtml = userProperties.getProperty('emailBodyHtml');
    data.emailBodyText = userProperties.getProperty('emailBodyText');
    return data;
}

function largeFormat(type) {
    var html = HtmlService.createTemplateFromFile('largeFormat');
    html.type = type;
    html = html.evaluate().setHeight(750).setWidth(750);
    SpreadsheetApp.getUi().showModalDialog(html, 'Email Body');
}
