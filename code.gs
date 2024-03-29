function clearDataValidations(sheet) {
    var maxRows = sheet.getMaxRows();
    var maxCols = sheet.getMaxColumns();
    var range = sheet.getRange(1,1,maxRows,maxCols);
    range.clearDataValidations();
}

function initialize(emailType,sendEmails){
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('[Display]');
    sheet.activate();
    var data = {};
    if (sheet == null) {
        data.success = false;
        data.errorMessage = 'The [Display] sheet was not found';
        return data;
    }
    var numRows = sheet.getLastRow();
    headers = sheet.getDataRange().offset(0,0,1).getValues()[0]; // 1D array

    var index = headers.indexOf('[ pdf ]');
    if (index == -1) {
        sheet.getRange(1,headers.length+1).setBackground('#26a69a').setHorizontalAlignment('center').setFontColor('white').setValue("[ pdf ]");
        headers.push('[ pdf ]')
    }

    index = headers.indexOf('[ email ]');
    if (index == -1) {
        sheet.getRange(1,headers.length+1).setBackground('#26a69a').setHorizontalAlignment('center').setFontColor('white').setValue("[ email ]");
        headers.push('[ email ]')
    }

    if (sendEmails) {
        var documentProperties = PropertiesService.getDocumentProperties();
        var emailToColName = documentProperties.getProperty('emailToColName');
        var emailSubject = documentProperties.getProperty('emailSubject');
        var emailBodyHtml = documentProperties.getProperty('emailBodyHtml');
        var emailBodyText = documentProperties.getProperty('emailBodyText');


        if (!emailToColName || !emailSubject) {
            data.success = false;
            data.errorMessage = "Recipient address or Subject is missing";
            return data;
        }
        if (emailType == 'text' && !emailBodyText) {
            data.success = false;
            data.errorMessage = "Email text body is empty";
            return data;
        }

        if (emailType == 'html' && !emailBodyHtml) {
            data.success = false;
            data.errorMessage = "Email HTML body is empty";
            return data;
        }

        if (emailType == 'draft') {
            var drafts = GmailApp.getDrafts();// Get all draft messages in your drafts folder
            if (!drafts.length) {
                data.success = false;
                data.errorMessage = "Email draft not found";
                return data;
            }
            var draftBody = drafts[0].getMessage().getBody();
            data.draftBody = draftBody;
        } else {
            data.draftBody = null;
        }

        emailToIndex = headers.indexOf(emailToColName);
        if (emailToIndex == -1) {
            data.success = false;
            data.errorMessage = "Recipient Email Column not found";
            return data;
        }
    }

    data.headers = headers;
    data.numRows = numRows - 1;
    data.success = true;
    return data;
}

function openSidebar() {
    ui = SpreadsheetApp.getUi();
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var displaySheetName = '[Display]';
    var sheet = ss.getSheetByName(displaySheetName);

    if (!sheet) {
        var response = ui.alert('Could not find sheet named [Display]\nCreate sheet?', ui.ButtonSet.YES_NO);
        if (response == ui.Button.NO) {
            return;
        }
        ss.insertSheet(displaySheetName,0);
        sheet = ss.getSheetByName(displaySheetName);
        sheet.activate();

    } else {
        sheet.activate();
        var response = ui.alert('Clear [Display] Sheet?', ui.ButtonSet.YES_NO);
        if (response == ui.Button.YES) {
            sheet.clear();
        }
    }

    sheet.setHiddenGridlines(false);
    sheet.setFrozenRows(0);
    sheet.setFrozenColumns(0);
    clearDataValidations(sheet);

    var data = {};

    var documentProperties = PropertiesService.getDocumentProperties();
    data.documentTemplateUrl = documentProperties.getProperty('documentTemplateUrl');
    data.pdfFolderUrl = documentProperties.getProperty('pdfFolderUrl');
    data.tempFolderUrl = documentProperties.getProperty('tempFolderUrl');
    data.pdfFileName = documentProperties.getProperty('pdfFileName');
    data.emailToColName = documentProperties.getProperty('emailToColName');
    data.emailCcColName = documentProperties.getProperty('emailCcColName');
    data.emailSubject = documentProperties.getProperty('emailSubject');
    data.emailBodyHtml = documentProperties.getProperty('emailBodyHtml');
    data.emailBodyText = documentProperties.getProperty('emailBodyText');

    var html = HtmlService.createTemplateFromFile('sidebar');
    html.data = data;
    html = html.evaluate();
    html.setTitle("Mail Merge");
    SpreadsheetApp.getUi().showSidebar(html);
}

function processRow(data) {

    var ccIndex,emailAddress,emailBody,emailColIndex,emailToIndex,emailSuccess,emailSendSuccess,headers,i,index,j,pdfFile,pdfFiles,pdfColIndex,sheet,emailSuccess,pdfSuccess,replace,re;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    sheet = ss.getSheetByName("[Display]");

    var rowNum = data.rowNum;

    if (sheet.isRowHiddenByFilter(rowNum) || sheet.isRowHiddenByUser(rowNum)) {
        data.success = true;
        data.rowNum ++;
        data.remainingRows --;
        return data;
    }

    var rowData = sheet.getRange(rowNum,1,1,data['headers'].length).getValues();
    rowData = rowData.shift();
    headers = data.headers;

    // form values
    var rowsToProcess = data.selectRows;
    var createPdfFiles = data.createPdfFiles;
    var savePdfFiles = data.savePdfFiles;
    var sendEmails = data.sendEmails;
    var includePdfAttachment = data.includePdfAttachment;
    if (!createPdfFiles) includePdfAttachment = null;

    // file and folder settings
    var documentProperties = PropertiesService.getDocumentProperties();
    var documentTemplateUrl = documentProperties.getProperty('documentTemplateUrl');
    var pdfFolderUrl = documentProperties.getProperty('pdfFolderUrl');
    var tempFolderUrl = documentProperties.getProperty('tempFolderUrl');
    var pdfFileName = documentProperties.getProperty('pdfFileName');

    if (createPdfFiles) {
        if (!documentTemplateUrl || !pdfFolderUrl || !tempFolderUrl || !pdfFileName) {
            data.success = false;
            data.errorMessage = "Please fill out all File and Folder Settings";
            return data;
        }
        var docFileId = getId(documentTemplateUrl);
        var pdfFolderId = getId(pdfFolderUrl);
        var tempFolderId = getId(tempFolderUrl);

        var docFile = DriveApp.getFileById(docFileId);
        var pdfFolder = DriveApp.getFolderById(pdfFolderId);
        var tempFolder = DriveApp.getFolderById(tempFolderId);
    }

    if (sendEmails) {
        var emailType = data.emailType;
        var emailToColName = documentProperties.getProperty('emailToColName');
        var emailCcColName = documentProperties.getProperty('emailCcColName');
        var emailSubject = documentProperties.getProperty('emailSubject');
        var emailBodyHtml = documentProperties.getProperty('emailBodyHtml');
        var emailBodyText = documentProperties.getProperty('emailBodyText');
        emailToIndex = headers.indexOf(emailToColName);
        ccIndex = headers.indexOf(emailCcColName);
    }

    pdfColIndex = headers.indexOf('[ pdf ]');
    emailColIndex = headers.indexOf('[ email ]');

    pdfSuccess = false;
    emailSendSuccess = false;

    if (rowData[pdfColIndex] && rowData[emailColIndex]) {
        data.success = true;
        data.remainingRows --;
        data.rowNum ++;
        return data;
    }

    if (createPdfFiles && rowData[pdfColIndex] && !sendEmails) {
        data.success = true;
        data.remainingRows --;
        data.rowNum ++;
        return data;
    }

    if (rowData[emailColIndex] && sendEmails && !createPdfFiles) {
        data.success = true;
        data.remainingRows --;
        data.rowNum ++;
        return data;
    }

    if (createPdfFiles) {

        // make a copy of file in memory (couldn't find a way)
        // 4.0 seconds to make a copy and delete it (3.5 and .5)

        // sample timer
        // var startSeconds = new Date().getTime();
        // var tempFile = docFile.makeCopy(tempFolder);
        // var endSeconds = new Date().getTime();
        // var duration = (endSeconds - startSeconds)/1000;
        // console.log("copy docFile = " + duration);

        var tempFile = docFile.makeCopy(tempFolder); // avg duration 3.5 seconds
        var tempDocFile = DocumentApp.openById(tempFile.getId()); // avg duration .1 seconds
        var body = tempDocFile.getBody();

        for (j = 0; j < headers.length; j++) {
            body.replaceText("{" + headers[j] + "}", rowData[j]); // does a global replace automatically
            pdfFileName = pdfFileName.replace("{" + headers[j] + "}", rowData[j]);
        }

        if (pdfFileName.slice(-4) != ".pdf") pdfFileName += ".pdf";

        var pdfContentBlob = tempDocFile.getAs(MimeType.PDF); // avg duration .1 seconds
        tempDocFile.saveAndClose();

        if (savePdfFiles) {

            if (!rowData[pdfColIndex]) {
                try {
                    pdfFile = pdfFolder.createFile(pdfContentBlob).setName(pdfFileName); // avg duration 2.5 seconds
                    sheet.getRange(rowNum,pdfColIndex+1).setHorizontalAlignment('center').setValue('created & saved');
                    pdfSuccess = true;
                } catch (error) {
                    sheet.getRange(rowNum,pdfColIndex+1).setHorizontalAlignment('left').setValue(error);
                    sheet.getRange(rowNum,emailColIndex+1).setHorizontalAlignment('center').setValue('not sent');
                    pdfSuccess = false;
                    sheet.getRange(rowNum,1,1,headers.length).setBackground("#ffcccc"); // red
                    data.success = true;
                    data.remainingRows --;
                    data.rowNum ++;
                    return data;
                }
            }
        } else {
            pdfSuccess = true;
            sheet.getRange(rowNum,pdfColIndex+1).setValue('created');
        }
    } else {
        pdfSuccess = true;
        sheet.getRange(rowNum,pdfColIndex+1).setHorizontalAlignment('center').setValue('n/a');
    }

    if (sendEmails) {

        if (!rowData[emailColIndex]) { // no value in email sent column

            if (!rowData[emailToIndex]) { // email To: address is blank
                emailSuccess = false;
                sheet.getRange(rowNum,emailColIndex+1).setValue('no email address');
            } else {
                emailAddress = rowData[emailToIndex];
                if (emailType == 'draft') {
                    emailBody = data.draftBody;
                    if (emailBody) {
                        for (j = 0; j < headers.length; j++) {
                            replace = "{" + headers[j] + "}";
                            re = new RegExp(replace,"g"); // global replace
                            emailBody = emailBody.replace(re,rowData[j]);
                        }
                    }
                }

                else if (emailType == 'text') {
                    emailBody = emailBodyText;
                    if (emailBody) {
                        for (j = 0; j < headers.length; j++) {
                            replace = "{" + headers[j] + "}";
                            re = new RegExp(replace,"g"); // global replace
                            emailBody = emailBody.replace(re,rowData[j]);
                        }
                        emailBody = emailBody.replace(/\n/g,'<br>');
                    }
                }

                else if (emailType == 'html') {
                    emailBody = emailBodyHtml;
                    if (!emailBody) {
                        emailBodyMessage = "Email HTML was empty";
                    }
                }

                try {
                    if (includePdfAttachment) {

                        if (!pdfFile) {
                            pdfContentBlob.setName(pdfFileName);
                            pdfFile = pdfContentBlob;
                            pdfSuccess = true;
                        }

                        if (ccIndex > -1) {
                            MailApp.sendEmail(emailAddress,emailSubject,null, {
                                attachments: [pdfFile],
                                htmlBody: emailBody,
                                cc:rowData[ccIndex]
                            });
                        } else {
                            MailApp.sendEmail(emailAddress,emailSubject,null, {
                                attachments: [pdfFile],
                                htmlBody: emailBody
                            });
                        }

                        sheet.getRange(rowNum,emailColIndex+1).setHorizontalAlignment('center').setValue('sent w/ attachment');
                        emailSuccess = true;

                    } else {
                        if (ccIndex > -1) {
                            MailApp.sendEmail(emailAddress,emailSubject,null, {
                                htmlBody: emailBody,
                                cc:rowData[ccIndex]
                            });
                        } else {
                            MailApp.sendEmail(emailAddress,emailSubject,null, {
                                htmlBody: emailBody,
                            });
                        }

                        sheet.getRange(rowNum,emailColIndex+1).setHorizontalAlignment('center').setValue('sent');
                        emailSuccess = true;
                    }


                } catch (error) {
                  sheet.getRange(rowNum,emailColIndex+1).setHorizontalAlignment('left').setValue(error);
                  emailSuccess = false;
                  sheet.getRange(rowNum,1,1,headers.length).setBackground("#ffcccc"); // red
                }


            }
        } else { // email has value in column
            emailSuccess = false;
        }

    } else { // do not send emails
        emailSuccess = true;
        sheet.getRange(rowNum,emailColIndex+1).setHorizontalAlignment('center').setValue('n/a');
    }

    if (pdfSuccess && emailSuccess) {
        sheet.getRange(rowNum,1,1,headers.length).setBackground("#e6ffe6"); // green
    }

    if (createPdfFiles) {
        // moved the delete function to here
        // after the PDF file is created, the temp file may be deleted
        // returned periodic errors when this code was placed immeidately after the creation of the PDF code
        // likely a bug where the create PDF method returns before the file is finished being created
        // and if so, the delete function fails

        // the only way to truly delete a file is Drive.Files.remove().  DriveApp.remove() simply removes its parent folder
        // optionally can setTrashed() = true and it goes in the trash for 30 days
        try {
            // NOTE
            // if the Temp folder is on a shared drive, only a Manager can permanently delete files and bi-pass the Trash
            // which is what Drive.remove() does.
            // we can't guarantee that a user is a "Manager", and must catch the error and terminate.
            Drive.Files.remove(tempFile.getId()); // avg duration .5 seconds
        } catch (error) {
            data.success = false;
            data.errorMessage = "There was an error deleting the Temp file. Check folder permissions and verify that the Temp folder is not on a Shared Drive. Process terminated."
            return data;
        }
    }

    data.success = true;
    data.remainingRows --;
    data.rowNum ++;
    return data;
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
    var documentProperties = PropertiesService.getDocumentProperties();
    documentProperties.setProperty('documentTemplateUrl',url.trim());
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
    var documentProperties = PropertiesService.getDocumentProperties();
    documentProperties.setProperty('pdfFolderUrl',url.trim());
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
    var documentProperties = PropertiesService.getDocumentProperties();
    documentProperties.setProperty('tempFolderUrl',url.trim());
    data.success = true;
    data.url = url;
    return data;
}

function savePdfFileName(fileName) {
    var data = {};
    var documentProperties = PropertiesService.getDocumentProperties();
    documentProperties.setProperty('pdfFileName',fileName.trim());
    data.success = true;
    data.fileName = fileName;
    return data;
}

function saveEmailToColName(colName) {
    var data = {};
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('[Display]');
    var headers = sheet.getDataRange().offset(0,0,1).getValues()[0]; // 1D array
    if (!headers.includes(colName)) {
        data.success = false;
        data.errorMessage = "Column name not found";
        return data;
    }
    var documentProperties = PropertiesService.getDocumentProperties();
    documentProperties.setProperty('emailToColName',colName.trim());
    data.success = true;
    data.colName = colName;
    return data;
}

function saveEmailCcColName(colName='') {
    var data = {};
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('[Display]');
    var headers = sheet.getDataRange().offset(0,0,1).getValues()[0]; // 1D array
    if (colName && !headers.includes(colName)) {
        data.success = false;
        data.errorMessage = "Column name not found";
        return data;
    }
    var documentProperties = PropertiesService.getDocumentProperties();
    documentProperties.setProperty('emailCcColName',colName.trim());
    data.success = true;

    if (!colName) {
        data.colName = '[ no column name ]';
    } else {
        data.colName = colName;
    }
    return data;
}

function saveEmailSubject(subject) {
    var data = {};
    var documentProperties = PropertiesService.getDocumentProperties();
    documentProperties.setProperty('emailSubject',subject.trim());
    data.success = true;
    data.subject = subject;
    return data;
}

function saveEmailBodyText(emailBodyText) {
    var documentProperties = PropertiesService.getDocumentProperties();
    documentProperties.setProperty('emailBodyText',emailBodyText.trim());
    data = {};
    data.success = true;
    data.emailBodyText = emailBodyText;
    return data;
}

function saveEmailBodyHtml(emailBodyHtml) {
    var documentProperties = PropertiesService.getDocumentProperties();
    documentProperties.setProperty('emailBodyHtml',emailBodyHtml.trim());
    data = {};
    data.success = true;
    data.emailBodyHtml = emailBodyHtml;
    return data;
}

function viewLargeFormat(type) {
    if (type == 'draft') {
        var drafts = GmailApp.getDrafts(); // Get the first draft message in your drafts folder
        if (!drafts.length) {
            var data = {};
            data.success = false;
            data.errorMessage = 'No draft emails were found';
            return data;
        }
    }
    var html = HtmlService.createTemplateFromFile('largeFormat');
    html.type = type;
    html = html.evaluate().setHeight(750).setWidth(750);
    SpreadsheetApp.getUi().showModalDialog(html, 'Email Body');
}
