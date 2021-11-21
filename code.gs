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
    var displaySheetName = '[Display]';
    var displaySheet = ss.getSheetByName(displaySheetName);

    if (!displaySheet) {
        var response = ui.alert('Could not find sheet named "[Display]"\nCreate sheet?', ui.ButtonSet.YES_NO);
        if (response == ui.Button.NO) {
            return;
        }
        ss.insertSheet(displaySheetName,0);
        displaySheet = ss.getSheetByName(displaySheetName);
        displaySheet.activate();
        formatDisplaySheet(displaySheet);

    } else {
        displaySheet.activate();
        var response = ui.alert('Format Display Sheet?', ui.ButtonSet.YES_NO);
        if (response == ui.Button.YES) {
            displaySheet.clear();
            formatDisplaySheet(displaySheet);
        }
    }

    var data = {};

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
    var sheet = ss.getSheetByName('[Display]');
    var headers = sheet.getDataRange().offset(1,0,1).getValues()[0]; // 1D array
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

function saveEmailBodyText(emailBodyText) {
    var userProperties = PropertiesService.getUserProperties();
    userProperties.setProperty('emailBodyText',emailBodyText.trim());
    data = {};
    data.success = true;
    data.emailBodyText = emailBodyText;
    return data;
}

function saveEmailBodyHtml(emailBodyHtml) {
    var userProperties = PropertiesService.getUserProperties();
    userProperties.setProperty('emailBodyHtml',emailBodyHtml.trim());
    data = {};
    data.success = true;
    data.emailBodyHtml = emailBodyHtml;
    return data;
}

function largeFormat(type) {
    var html = HtmlService.createTemplateFromFile('largeFormat');
    html.type = type;
    html = html.evaluate().setHeight(750).setWidth(750);
    SpreadsheetApp.getUi().showModalDialog(html, 'Email Body');
}

function processRows(formData) {

    var data={},returnData={},emailAddress,emailBody,emailSentIndex,headers,i,index,emailIindexj,pdfFile,pdfFiles,pdfCreatedIndex,sheet,emailSuccess,pdfSuccess,replace,re;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    sheet = ss.getSheetByName("[Display]");
    if (!sheet) {
        Browser.msgBox('The "[Display]" tab was not found');
        return;
    }
    sheet.activate();

    // form values
    var rowsToProcess = formData.selectRows;
    var createPdfFiles = formData.createPdfFiles;
    var savePdfFiles = formData.savePdfFiles;
    var sendEmails = formData.sendEmails;
    var includePdfAttachment = formData.includePdfAttachment;
    if (!createPdfFiles) includePdfAttachment = null;

    // file and folder settings
    var userProperties = PropertiesService.getUserProperties();
    var documentTemplateUrl = userProperties.getProperty('documentTemplateUrl');
    var pdfFolderUrl = userProperties.getProperty('pdfFolderUrl');
    var tempFolderUrl = userProperties.getProperty('tempFolderUrl');
    var pdfFileName = userProperties.getProperty('pdfFileName');

    if (createPdfFiles) {
        if (!documentTemplateUrl || !pdfFolderUrl || !tempFolderUrl || !pdfFileName) {
            returnData.success = false;
            returnData.errorMessage = "Please fill out all File and Folder Settings";
            return returnData;
        }
        var docFileId = getId(documentTemplateUrl);
        var pdfFolderId = getId(pdfFolderUrl);
        var tempFolderId = getId(tempFolderUrl);

        var docFile = DriveApp.getFileById(docFileId);
        var pdfFolder = DriveApp.getFolderById(pdfFolderId);
        var tempFolder = DriveApp.getFolderById(tempFolderId);
    }


    if (sendEmails) {
        var emailType = formData.emailType;
        var emailToColName = userProperties.getProperty('emailToColName');
        var emailSubject = userProperties.getProperty('emailSubject');
        var emailBodyHtml = userProperties.getProperty('emailBodyHtml');
        var emailBodyText = userProperties.getProperty('emailBodyText');
        if (!emailToColName || !emailSubject || !(emailBodyHtml || emailBodyText)) {
            returnData.success = false;
            returnData.errorMessage = "Please fill out all Email Settings";
            return returnData;
        }

    }

    data = sheet.getDataRange().getValues();
    data.shift();
    headers = data.shift();
    if (rowsToProcess == 'firstRow') {
        data = [data[0]];
    }

    emailToIndex = headers.indexOf(emailToColName);
    pdfCreatedIndex = headers.indexOf('pdf created');
    emailSentIndex = headers.indexOf('email sent');

    for (i = 0; i < data.length; i++) {

        pdfSuccess = 0;
        emailSuccess = 0;
        if (data[i][pdfCreatedIndex] && data[i][emailSentIndex]) continue; // skip if both columns contain values
        if (createPdfFiles && data[i][pdfCreatedIndex] && !sendEmails) continue;
        if (data[i][emailSentIndex] && sendEmails && !createPdfFiles) continue;

        if (createPdfFiles) {

            var tempFile = docFile.makeCopy(tempFolder);
            var tempDocFile = DocumentApp.openById(tempFile.getId());
            var body = tempDocFile.getBody();

            for (j = 0; j < headers.length; j++) {
                body.replaceText("{" + headers[j] + "}", data[i][j]); // does a global replace automatically
                pdfFileName = pdfFileName.replace("{" + headers[j] + "}", data[i][j]);
            }

            tempDocFile.saveAndClose();
            var pdfContentBlob = tempFile.getAs(MimeType.PDF);
            tempFolder.removeFile(tempFile);

            if (savePdfFiles) {

                if (!data[i][pdfCreatedIndex]) {
                    try {
                      pdfFile = pdfFolder.createFile(pdfContentBlob).setName(pdfFileName);
                      sheet.getRange(i+3,pdfCreatedIndex+1).setValue('yes');
                      pdfSuccess = 1;
                    } catch (error) {
                      sheet.getRange(i+3,pdfCreatedIndex+1).setValue(error);
                      sheet.getRange(i+3,emailSentIndex+1).setValue('no');
                      pdfSuccess = 0;
                      sheet.getRange(i+3,1,1,headers.length).setBackground("#ffcccc"); // red
                      continue;
                    }
                }
            } else {
                pdfSuccess = 1;
                sheet.getRange(i+3,pdfCreatedIndex+1).setValue('n/a');
            }
        } else {
            pdfSuccess = 1;
            sheet.getRange(i+3,pdfCreatedIndex+1).setValue('n/a');
        }

        if (sendEmails) {
            if (!data[i][emailSentIndex]) { // no value in email sent column

                if (!data[i][emailToIndex]) { // email To: address is blank
                    emailSuccess = 0;
                    sheet.getRange(i+3,emailSentIndex+1).setValue('no email address');
                } else {
                    emailAddress = data[i][emailToIndex];

                    if (emailType == 'text') {
                        emailBody = emailBodyText;
                        for (j = 0; j < headers.length; j++) {
                            replace = "{" + headers[j] + "}";
                            re = new RegExp(replace,"g"); // global replace
                            emailBody = emailBody.replace(re,data[i][j]);
                        }
                        emailBody = emailBody.replace(/\n/g,'<br>');
                    } else if (emailType == 'html') {
                        emailBody = emailBodyHtml;
                    }

                    try {

                        if (includePdfAttachment) {
                            if (!pdfFile) {
                                pdfContentBlob.setName(pdfFileName);
                                pdfFile = pdfContentBlob;
                                pdfSuccess = 1;
                            }
                            MailApp.sendEmail(emailAddress,emailSubject,null, {
                                attachments: [pdfFile],
                                htmlBody: emailBody
                            });

                        } else {
                            MailApp.sendEmail(emailAddress,emailSubject,null, {
                                htmlBody: emailBody
                          });
                        }

                      sheet.getRange(i+3,emailSentIndex+1).setValue('yes');
                      emailSuccess = 1;
                    } catch (error) {
                      sheet.getRange(i+3,emailSentIndex+1).setValue(error);
                      emailSuccess = 0;
                      sheet.getRange(i+3,1,1,headers.length).setBackground("#ffcccc"); // red
                    }
                }
            } else { // email has value in column
                emailSuccess = 1;
            }

        } else { // do not send emails
            emailSuccess = 1;
            sheet.getRange(i+3,emailSentIndex+1).setValue('n/a');
        }

        if (pdfSuccess && emailSuccess) {
            sheet.getRange(i+3,1,1,headers.length).setBackground("#e6ffe6"); // green
        } else {
           sheet.getRange(i+3,1,1,headers.length).setBackground("#ffcccc"); // red
        }
    }
    returnData.success = true;
    return returnData;
}





