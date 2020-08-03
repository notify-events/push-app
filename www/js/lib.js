Array.prototype.getColumn = function (column) {
    let result = [];

    this.forEach((value, key) => {
        result.push(value[column]);
    });

    return result;
};

const alert = {
    success: (message, callback) => {
        navigator.notification.alert(message, callback, 'Success');
    },
    error: (message, callback) => {
        navigator.notification.alert(message, callback, 'Error');
    },
    fatal: (message) => {
        navigator.notification.alert(message, () => {
            navigator.app.exitApp();
        }, 'Error', 'Close');
    },
    confirm: (title, message, callback, buttons) => {
        if (!buttons) {
            buttons = {ok: 'Ok', cancel: 'Cancel'};
        }

        navigator.notification.confirm(message, (buttonIndex) => {
            callback(Object.keys(buttons)[buttonIndex - 1]);
        }, title, Object.values(buttons));
    },
};
