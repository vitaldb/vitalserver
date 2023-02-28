:START

SET CUR_DATE=%date:~0,4%%date:~5,2%%date:~8,2%
SET CUR_HH=%time:~0,2%
IF %CUR_HH% LSS 10 (SET CUR_HH=0%time:~1,1%)

SET CUR_NN=%time:~3,2%
SET CUR_SS=%time:~6,2%
SET CUR_MS=%time:~9,2%

SET SUBFILENAME=%CUR_DATE%_%CUR_HH%%CUR_NN%%CUR_SS%

node C:\Users\vitallab\vitalserver\source\app.js > C:\Users\vitallab\vitalserver\logs\vitalserver_%SUBFILENAME%.log 2>&1
@GOTO START