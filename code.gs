var ss = SpreadsheetApp.getActiveSpreadsheet();

function createAndSend(test=0) {
    var data,emailAddress,emailBody,emailSentIndex,headers,i,index,emailIindexj,pdfFile,pdfFiles,pdfCreatedIndex,sheet,emailSuccess,pdfSuccess,replace,re;
    var sheet = ss.getSheetByName('Config');
    if (!sheet) {
        Browser.msgBox('The "Config" tab was not found');
        return;
    }
    var docFileId = getId(sheet.getRange('B1').getValue());
    var pdfFolderId = getId(sheet.getRange('B2').getValue());
    var tempFolderId = getId(sheet.getRange('B3').getValue());
    var pdfName = sheet.getRange('B4').getValue();
    var emailSubject = sheet.getRange('B5').getValue();
    var emailBodyHTML = sheet.getRange('B6').getValue();

    var docFile = DriveApp.getFileById(docFileId);
    var tempFolder = DriveApp.getFolderById(tempFolderId);
    var pdfFolder = DriveApp.getFolderById(pdfFolderId);

    if (test) {
        sheet = ss.getSheetByName("Test Data");
        if (!sheet) {
            Browser.msgBox('The "Test Data" tab was not found');
            return;
        }
        sheet.activate();
    }
    else {
        sheet = ss.getSheetByName("Data");
        if (!sheet) {
            Browser.msgBox('The "Data" tab was not found');
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
    html = html.evaluate().setWidth(725).setHeight(700);
    SpreadsheetApp.getUi().showModalDialog(html, ' Mail Merge - Help');
}
