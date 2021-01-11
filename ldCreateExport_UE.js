//==========================================================================================================================
//   Copyright © 2008-2017 Alterview Net Solutions AB, All Rights Reserved. 
//   Copyright © 2008-2017 Alterview Net Solutions AB, Alla Rättigheter Reserverade. 
// 
//  ldCreateExport_UE.js 
// 
//  Description 
//  ------------------------------------------------------------------------------------------------------------------------
//  User Event functions to create shadow records for integration purpose
//
//  History 
//  When            Name    Where           Description 
//  ------------------------------------------------------------------------------------------------------------------------
//  2017-10-06      Pablo Schneiter         Created
//==========================================================================================================================

function guid() {
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}
function s4() {
  return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
}

function avnsIsEmpty(obj){if(obj==undefined)return true;if(obj==null)return true;if(obj.length==0)return true;if(Object.prototype.toString.call(obj)=='[object Object]'){if(Object.keys(obj).length==0)return true;}
return false;}

function acCreateTrxExportAfterSubmit(type){
	nlapiLogExecution("DEBUG",arguments.callee.name,"start, type="+type);	
	if (type != 'create' && type != 'edit') return;
	try{
		var id = nlapiGetRecordId();
		var filters = [];
		filters[0] = new nlobjSearchFilter('custrecord_ac_texp_transaction', null, 'anyof', id);
		var search = nlapiSearchRecord('customrecord_ac_transaction_export', null, filters);
		if(avnsIsEmpty(search)){
			var rec_export = nlapiCreateRecord('customrecord_ac_transaction_export');
			rec_export.setFieldValue('custrecord_ac_texp_transaction', id);
			rec_export.setFieldValue('externalid', id);
			var id_export = nlapiSubmitRecord(rec_export);
			nlapiLogExecution("DEBUG",arguments.callee.name, "Transaction Export[" + id_export + "]" + " is created.");			
		}else{
			nlapiLogExecution("DEBUG",arguments.callee.name, "Transaction Export already exists. Transaction id " + id);	
		}
	}catch(err){
		nlapiLogExecution("ERROR",arguments.callee.name,err.message);
		nlapiLogExecution("ERROR",arguments.callee.name, "Transaction[" + id + "]" + " missing customrecord_ac_transaction_export record.");
		
	}
	nlapiLogExecution("DEBUG",arguments.callee.name,"exit");
}

function acCreateShowExportAfterSubmit(type){
	nlapiLogExecution("DEBUG",arguments.callee.name,"start, type="+type);	

	if (type != 'create' && type != 'edit') return;
	try{
		var id = nlapiGetRecordId();
		var filters = [];
		filters[0] = new nlobjSearchFilter('custrecord_ac_sexp_show', null, 'anyof', id);
		var search = nlapiSearchRecord('customrecord_ac_show_export', null, filters);
		if(avnsIsEmpty(search)){
			var rec_export = nlapiCreateRecord('customrecord_ac_show_export');
			rec_export.setFieldValue('custrecord_ac_sexp_show', id);
			rec_export.setFieldValue('externalid', id);
			var id_export = nlapiSubmitRecord(rec_export);
			nlapiLogExecution("DEBUG",arguments.callee.name, "Show Export[" + id_export + "]" + " is created.");
		}else{
			nlapiLogExecution("DEBUG",arguments.callee.name, "Show Export already exists. Show id " + id);	
		}
		

		}catch(err){
		nlapiLogExecution("ERROR",arguments.callee.name,err.message);
		nlapiLogExecution("ERROR",arguments.callee.name, "Show[" + id + "]" + " missing customrecord_ac_show_export record.");
		
	}
	nlapiLogExecution("DEBUG",arguments.callee.name,"exit");
}

// Set External Id 
// For some reason it does not work to set externalid beforeSubmit which is how it should be done
// setting it after submit is a bad choice but the only way that I could find to make it work
// 
function acCreateExternalidAfterSubmit(type){
	nlapiLogExecution("DEBUG",arguments.callee.name,"start, type="+type);	

	if (type != 'create' && type != 'edit') return;
	
	try{
		var id = nlapiGetRecordId();
		var recordtype = nlapiGetRecordType();
		
		nlapiLogExecution('DEBUG',arguments.callee.name,'record type:'+recordtype)
		nlapiLogExecution('DEBUG',arguments.callee.name,'internal id:'+id);

		// set externalid if not set 
		var externalid = nlapiLookupField(recordtype,id,'externalid');
		nlapiLogExecution('DEBUG','External id: ', externalid);
		if (avnsIsEmpty(externalid)) {
			externalid = guid();
			nlapiSubmitField(recordtype,id,'externalid',guid());
			nlapiLogExecution('DEBUG','New External id: ', externalid);
		}
	}catch(err){
		nlapiLogExecution("ERROR",arguments.callee.name,err.message);
		nlapiLogExecution("ERROR",arguments.callee.name, "External ID for "+recordtype+" with id: [" + id + "]" + " could not be set");
		
	}
	nlapiLogExecution("DEBUG",arguments.callee.name,"exit");
}
