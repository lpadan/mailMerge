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

