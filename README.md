# AVNS-CRUD
NetSuite SuiteBundle (208389) AVNS CRUD. 
A Restlet to Create, Read, Update and Delete any record in Netsuite. 
The REST-call can handle both custom and standard records.
It is also possible to provide sublist parameters to create and update fields in more complex transaction and entity records.

Fields may be referenced either by their netsuite internal id or their external id and also
updates and creation calls may use external ids to reference values of list/record type.

The permissions given to the external application user in Netsuite are defined in the role
used in the RESTLET-call. That will decide whether the operations on the record provided in
parameter “recordtype” are allowed

All operations are single record.

More info in Wiki - https://github.com/nordic-netsuite/AVNS-CRUD/wiki
