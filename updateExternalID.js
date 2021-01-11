
function guid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
}

var rec = nlapiLoadRecord('salesorder', 3405);

var externalid = guid();

rec.setFieldValue('externalid',externalid);

var id = nlapiSubmitRecord(rec,true,true);

var d=3;
