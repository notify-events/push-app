```shell script
export CONFIG=dev
export CONFIG=prod

cordova build android
cordova build android --release
cordova build android --release -- --packageType=apk
cordova emulate android
cordova run android
```
