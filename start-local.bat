@echo off
echo Setting up local environment with multi-database...

REM Set environment variables for local testing
set ACCOUNT_DATABASE_URL=mysql://3RuJearhG6mBc5U.root:I9Zv1Xm2CJPdkU9v@gateway01.ap-northeast-1.prod.aws.tidbcloud.com:4000/test?ssl={"rejectUnauthorized":true}
set MESSAGE_DATABASE_URL=memory://
set ADMIN_PASSWORD=admin-user-pass=version1-iwyegv
set PASS_BANANA=bananananana
set PASS_CHOCOWAKAME=wakametube=banana
set PASS_BANANA_LEFT=ばななの右腕だよ♡
set PASS_BANANA_RIGHT=ばななの左腕だよ☆
set PASS_WOOLISBEST_PLUS=html-astroid=gg
set PASS_WOOLISBEST=woolisbest=html-astroid=gg
set PASS_YOSSHY=thisismypassword
set PASS_AIROU=aiueo

echo Starting server with multi-database configuration...
node index.js

pause
