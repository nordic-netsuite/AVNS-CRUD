//==========================================================================================================================
//   Copyright © 2008-2012 Alterview    Net Solutions AB, All Rights Reserved. 
//   Copyright © 2008-2012 Alterview Net Solutions AB, Alla Rättigheter    Reserverade. 
// 
//  avnsCRUD.js 
// 
//  Description 
//  ------------------------------------------------------------------------------------------------------------------------
//   This script could be used to Create Read Update and Delete records in Netsuite.
//   When reading a record, the script will load the record and Stringify the result (nlobjRecord)
// 	 Due to limitations in Netsuites way of Stringify the result, some important fields are missing for example
//   the line field, which could be used to identify a sublist line. (The line field is unique and could be used during updates
//  History 
//  When            Name    Where           Description 
//  ------------------------------------------------------------------------------------------------------------------------
//  2017-09-11      Per Burman              If this script works, its written by Per Burman otherwise i do not know who wrote it. 
/*  2017-10-04		PBN						added	following features
											1. Possiblility to give externalid instead of id when reading/updating a record.This feature is slow due to a search
											2. Possiblility to give externalid for a select field. 
											For each field you must supply:
											src: the script id for the record. For example customer, customrecord_abc etc.
											externalid: the externalid for selected value.
											Note that the record must support externalid otherwise the functionality will not work at all.
											see example in the end of the file
											
*/
//==========================================================================================================================
function ResponseResult(){this.status='OK';this.details=[];this.AddErrorMessage=function(msg){this.status='ERROR';this.details.push(msg);return this;}
this.AddInfoMessage=function(msg){this.details.push(msg);return this;}
this.DisplayStatus=function(){var msg='Status = '+this.status+'\n';msg+=this.details.join('\n');return msg;}}
function avnsIsEmpty(obj){if(obj==undefined)return true;if(obj==null)return true;if(obj.length==0)return true;if(Object.prototype.toString.call(obj)=='[object Object]'){if(Object.keys(obj).length==0)return true;}
return false;}
function UnveilErrorObject(err) {
	var msg = {};
	if (err instanceof nlobjError) {
		msg.code = err.getCode();
		msg.detail = err.getDetails();
		msg.id = err.getInternalId();
//		msg.stackTrace = err.getStackTrace();
//		msg.userevent = err.getUserEvent();
	} else if (err instanceof Error) {
		msg.code = err.name;
		msg.detail = (err.description != null ? err.description + ': ' : '') + (err.message != null ? err.message : '');
//		msg.stackTrace = (err.fileName != null ? err.fileName + ': ' : '') + (err.lineNumber != null ? err.lineNumber : '')
	} else {
		msg.detail = err.toString();
	}
	return msg; //JSON.stringify(msg);
}

//============================================================//
//	function: avnsIsEmpty
//	Comments: Helper function
//	inparams: object 
//	Returnvalue: {boolean}
//============================================================//
function avnsIsEmpty(obj){
	if(obj == undefined)return true;
	if(obj == null)return true;
	if(obj.length == 0)return true;
	if(Object.prototype.toString.call(obj) == '[object Object]'){
		if(Object.keys(obj).length == 0)return true;
	}
	return false;
}
function getSpecialSublists(rectype){
	var rectypes = {
			'creditmemo':{
				apply:'line',
				item:'line'
			},
			'customerpayment':{
				apply:'line',
				credit:'line'
			},
			'customerrefund':{
				apply:'line',
			},
			'customerpayment':{
				apply:'line',
			},
			'estimate':{
				item:'line'
			},
			'expensereport':{
				expense:'line'
			},
			'inventoryadjustment':{
				inventory:'line'
			},
			'invoice':{
				item:'line',
				expcost:'line',
				itemcost:'line'
			},
			'itemfulfillment':{
				item:'line'
			},
			'journalentry':{
				line:'line'
			},
			'opportunity':{
				item:'line'
			},
			'purchaseorder':{
				expense:'line',
				item:'line'
			},
			'salesorder':{
				item:'line'
			}
	};
	if(rectype in rectypes) return rectypes[rectype];
	return null;
	return rectypes;
}	

//============================================================//
//    function: avnsCRUDRestlet
//    Comments: 
//    inparams: 
//    datain
//    Returnvalue: {ResponseResult}
//============================================================//
function avnsCRUDRestlet(datain){
	nlapiLogExecution("DEBUG",arguments.callee.name,"start");
	var result = new ResponseResult();
	try{
		if(!('action' in datain)||avnsIsEmpty(datain.action)){
			throw nlapiCreateError('MISSING_PARAM', 'missing parameter action');
		}
		switch(datain.action){
			case 'create': return createRecord(result,datain);
			case 'read': return readRecord(result,datain);
			case 'update': return updateRecord(result,datain);
			case 'delete': return deleteRecord(result,datain);
			default:
				throw nlapiCreateError('UNKNOWN_PARAM_VALUE', 'unknown value for parameter action');
				break;
		}
	}catch(err){
		result.AddErrorMessage(UnveilErrorObject(err));
		nlapiLogExecution("ERROR",arguments.callee.name,err.message);
	}
	nlapiLogExecution("DEBUG",arguments.callee.name,"exit");
	return result;
}
/*
	if row.key && row.keyvalue exist its an update otherwise its a new record and we just add new lines to the record
*/
function updateSublists(rec,datain){
	if(('sublists' in datain)&& !avnsIsEmpty(datain.sublists)){
		var sublists = datain.sublists;
		for( var sub = 0; sub < sublists.length; sub++){
			var sublist = sublists[sub];
			for( var r = 0; r < sublist.rows.length; r++){
				var row = sublist.rows[r];
				if(('key' in row)&&!avnsIsEmpty(row.key)&&("keyvalue" in row)&&!avnsIsEmpty(row.keyvalue)){
					var linenum = rec.findLineItemValue(sublist.id, row.key, row.keyvalue);
					rec.selectLineItem(sublist.id, linenum);
				}else{
					rec.selectNewLineItem(sublist.id);
				}	
				for( var f = 0; f < row.fields.length; f++){
					var field = row.fields[f];
					var value = field.value;
					if(field.text){
						var option = rec.getLineItemField(sublist.id, field.name, 1).getSelectOptions(field.value,'is');
						if(option && option.length==1){
							value = option[0].getId();
						}
					}	
					rec.setCurrentLineItemValue(sublist.id,field.name,value);
				}
				rec.commitLineItem(sublist.id);
			}
		}
	}	
}
function createRecord(result,datain){
	try{
		var rec = nlapiCreateRecord(datain.recordtype,('customform' in datain)&&!avnsIsEmpty(datain.customform)?{customform:datain.customform,recordMode:'dynamic'}:{recordMode:'dynamic'});
		updateFields(rec,datain);
		updateSublists(rec,datain);
	
		var id = nlapiSubmitRecord(rec,true,true);
		if('returntype' in datain && !avnsIsEmpty(datain.returntype)){
			if(datain.returntype=='record' || datain.returntype=='externalid'){
				readRecord(result,{recordtype:datain.recordtype,id:id,returntype:datain.returntype});
			}else if(datain.returntype=='id'){
				result.id=id;
			}
		}			
	}catch(err){
		result.AddErrorMessage(UnveilErrorObject(err));
		nlapiLogExecution("ERROR",arguments.callee.name,err.message);
	}
	return result;
}
function FindRecord(datain){
	var rec = null;
	if(('id' in datain)&&!avnsIsEmpty(datain.id)){
		rec = nlapiLoadRecord(datain.recordtype,datain.id);
	}else if(('externalid' in datain)&&!avnsIsEmpty(datain.externalid)){
		var r = nlapiSearchRecord(datain.recordtype,null,[['externalid','is',datain.externalid]]);
		if(r && r.length>0){
			rec=nlapiLoadRecord(datain.recordtype,r[0].getId());
		}else{
			throw nlapiCreateError("NOT_FOUND","No record with externalid="+datain.externalid + ", exist");
		}
	}else{
		throw nlapiCreateError("MISSING_PARAM","id or externalid must be supplied");
	}
	return rec;
}
function readRecord(result,datain){
	try{
		var  rec=FindRecord(datain);
		if('returntype' in datain && !avnsIsEmpty(datain.returntype)){
			if( datain.returntype=='record'){
				result.record = JSON.parse(JSON.stringify(rec));
				// somebody at netsuite do not think that externalid is important. that's not true...
				if( !('externalid' in result.record)){
					result.record.externalid = rec.getFieldValue('externalid');
				}
				// somebody at netsuite do not think the line field is important. that's not true...
				var type = getSpecialSublists(datain.recordtype);
				if( type){
					for( var t in type){
						var tmp = type[t];
						var len = rec.getLineItemCount(t);
						for( var i = 1; i <= len;i++){
							result.record[t][i-1][tmp]=rec.getLineItemValue(t,tmp,i);
						}
					}
				}
			}else if(datain.returntype=='id'){
				result.id=rec.getId();
			}else if(datain.returntype=='externalid'){
				result.externalid=rec.getFieldValue('externalid');
			}
		}			
	}catch(err){
		result.AddErrorMessage(UnveilErrorObject(err));
		nlapiLogExecution("ERROR",arguments.callee.name,err.message);
	}
	return result;
}
function updateFields(rec,datain){
	for( var i = 0; i < datain.fields.length; i++){
		var field = datain.fields[i];
		if(field.text){
			rec.setFieldText(field.name,field.value);
		}else if(("src" in field)&&!avnsIsEmpty(field.src)&&("externalid" in field)&&!avnsIsEmpty(field.externalid)){
			var r = nlapiSearchRecord(field.src,null,[['externalid','is',field.externalid]]);
			if( r && r.length>0){
				var value = r[0].getId();
				rec.setFieldValue(field.name,value);
			}
		}else{
			rec.setFieldValue(field.name,field.value);
		}				
	}
}
function updateRecord(result,datain){
	try{
		var  rec=FindRecord(datain);
		updateFields(rec,datain);
		updateSublists(rec,datain);

		var id = nlapiSubmitRecord(rec,true,true);
		if('returntype' in datain && !avnsIsEmpty(datain.returntype)){
			if(datain.returntype=='record' || datain.returntype=='externalid'){
				readRecord(result,{recordtype:datain.recordtype,id:id,returntype:datain.returntype});
			}else if(datain.returntype=='id'){
				result.id=id;
			}
		}			
	}catch(err){
		result.AddErrorMessage(UnveilErrorObject(err));
		nlapiLogExecution("ERROR",arguments.callee.name,err.message);
	}
	return result;
}
function deleteRecord(result,datain){
	try{
		var  rec=FindRecord(datain);
		var rec = nlapiDeleteRecord(datain.recordtype,rec.id);
	}catch(err){
		result.AddErrorMessage(UnveilErrorObject(err));
		nlapiLogExecution("ERROR",arguments.callee.name,err.message);
	}
	return result;
}
/* Some small tests with a transaction 
var datain1={
	recordtype:"salesorder",
	customform:"", // optional, internalid of form
	action:"create",	// "create","read","update","delete"
	returntype:"record", // "record/"id"/"externalid"
	fields:[
		{"name":"entity",value:"Testkund AB",text:true},
		{"name":"externalid",value:"testkund123",text:false},
		{"name":"custbody_avnscrud_test",src:"customrecord_avnscrudrec",externalid:"abc1",text:false},
	],
	sublists:[
		{
			id:"item",
			rows:[
			{
				fields:[
					{"name":"item",value:45,text:false},
					{"name":"quantity",value:"2",text:false},
				]
			},
			{
				fields:[
					{"name":"item",value:"Accessories : Cable - Cat 5, 10 ft",text:true},
				]
			},
			]
		}
	]	
}
// READ WITH ID 
var res1 = avnsCRUDRestlet(datain1);
var datain2={
	recordtype:"salesorder",
	customform:"", // optional, internalid of form
	action:"read",	// "create","read","update","delete"
	id:res1.record.id,
	returntype:"record", // "record/"id"
}
var res2 = avnsCRUDRestlet(datain2);

// READ WITH EXTERNALID 
var datain3={
	recordtype:"salesorder",
	customform:"", // optional, internalid of form
	action:"read",	// "create","read","update","delete"
	externalid:res1.record.externalid,
	returntype:"record", // "record/"id"
}
var res3 = avnsCRUDRestlet(datain3);

// UPDATE WITH ID 
var datain4={
	recordtype:"salesorder",
	customform:"", // optional, internalid of form
	action:"update",	// "create","read","update","delete"
	id:res3.record.id,
	returntype:"record", // "record/"id"
	fields:[
		{"name":"memo",value:"test-id",text:false},
	],
	sublists:[
		{
			id:"item",
			rows:[
			{
				key:'line',
				keyvalue:'2',
				fields:[
					{"name":"quantity",value:"2",text:false},
				]
			},
			{
				key:'line',
				keyvalue:'1',
				fields:[
					{"name":"quantity",value:"1",text:false},
				]
			},
			]
		}
	]	
}
var res4 = avnsCRUDRestlet(datain4);
// UPDATE WITH EXTERNALID 
var datain5={
	recordtype:"salesorder",
	customform:"", // optional, internalid of form
	action:"update",	// "create","read","update","delete"
	externalid:res4.record.externalid,
	returntype:"record", // "record/"id"
	fields:[
		{"name":"memo",value:"test-externalid",text:false},
	],
	sublists:[
		{
			id:"item",
			rows:[
			{
				key:'line',
				keyvalue:'2',
				fields:[
					{"name":"quantity",value:"2",text:false},
				]
			},
			{
				key:'line',
				keyvalue:'1',
				fields:[
					{"name":"quantity",value:"1",text:false},
				]
			},
			]
		}
	]	
}
var res5 = avnsCRUDRestlet(datain5);

var datain4={
	recordtype:"salesorder",
	action:"delete",	// "create","read","update","delete"
	id:res3.record.id,
}
var res4 = avnsCRUDRestlet(datain4);

var d = 4;

*/