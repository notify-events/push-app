const app = {
    settings: {
        identity: null,
        platform: null,
        token: null,
        title: null,
    },

    init: async () => {
        app.settings = {
            identity: device.uuid,
            platform: device.platform,
            token: null,
            title: device.model,
        };

        app.read.load();

        app.vue = new Vue({
            el: '#app',

            data: {
                action: 'preloader',
                data: {},
            },
            filters: {
                moment: (time, format) => {
                    return moment.unix(time).format(format);
                },
            },
            methods: {
                channelIndex: app.action.channelIndex,

                channelReadAll: app.action.channelReadAll,

                messageIndex: app.action.messageIndex,

                messageView:  app.action.messageView,

                channelSubscribe:     app.action.channelSubscribe,
                channelSubscribeSave: app.action.channelSubscribeSave,
                channelUnsubscribe:   app.action.channelUnsubscribe,

                settings:     app.action.settings,
                settingsSave: app.action.settingsSave,

                goBack: app.action.goBack,
            },
        });

        const initAction = (channel, message) => {
            $('#app').removeClass('not-init');

            if (channel) {
                app.notification.onClick(channel, message);
            } else {
                app.action.channelIndex();
            }
        };

        await app.notification.init((channel, message) => {
            app.api.settingsView((settings) => {
                if (settings.token !== app.settings.token) {
                    settings.token = app.settings.token;

                    app.settings = settings;

                    app.api.settingsUpdate(app.settings, () => {
                        initAction(channel, message);
                    }, (e) => {
                        alert.fatal(JSON.stringify(e));
                    })
                } else {
                    app.settings = settings;

                    initAction(channel, message);
                }
            }, (e) => {
                app.api.settingsUpdate(app.settings, () => {
                    initAction(channel, message);
                }, (e) => {
                    alert.fatal(JSON.stringify(e));
                });
            });
        });

        document.addEventListener('backbutton', app.action.goBack, false);
    },

    notification: {
        allowPush: false,
        allowLocalNotification: false,

        init: async (initAction) => {
            app.notification.allowPush = await FCM.requestPushPermission();

            cordova.plugins.notification.local.requestPermission((allow) => {
                app.notification.allowLocalNotification = allow;

                cordova.plugins.notification.local.on('click', (payload) => {
                    const channel = payload.data.channel;
                    const message = payload.data.message;

                    app.notification.onClick(channel, message);
                });
            });

            if (app.notification.allowPush) {
                await FCM.createNotificationChannel({
                    id: '1-highest',
                    name: 'Highest',
                    importance: 'high',
                    visibility: 'public',
                    lights: true,
                    vibration: true
                });

                await FCM.createNotificationChannel({
                    id: '2-high',
                    name: 'High',
                    importance: 'high',
                    visibility: 'public',
                    lights: true,
                    vibration: true
                });

                await FCM.createNotificationChannel({
                    id: '3-normal',
                    name: 'Normal',
                    importance: 'default',
                    visibility: 'public',
                    lights: true,
                    vibration: true
                });

                await FCM.createNotificationChannel({
                    id: '4-low',
                    name: 'Low',
                    importance: 'low',
                    visibility: 'public',
                    lights: true,
                    vibration: true
                });

                await FCM.createNotificationChannel({
                    id: '5-lowest',
                    name: 'Lowest',
                    importance: 'min',
                    visibility: 'public',
                    lights: true,
                    vibration: false
                });

                app.settings.token = await FCM.getToken();

                FCM.onNotification((payload) => {
                    const channel = JSON.parse(payload['data-channel']);
                    const message = JSON.parse(payload['data-message']);

                    if (payload.wasTapped) {
                        app.notification.onClick(channel, message);
                    } else {
                        app.notification.onTrigger(payload.title, payload.body, channel, message);
                    }
                });

                const payload = await FCM.getInitialPushPayload();

                if (payload) {
                    const channel = JSON.parse(payload['data-channel']);
                    const message = JSON.parse(payload['data-message']);

                    initAction(channel, message);
                } else {
                    initAction();
                }
            } else {
                initAction();
            }
        },

        onTrigger: (title, text, channel, message) => {
            if (app.notification.allowLocalNotification) {
                cordova.plugins.notification.local.schedule({
                    title: title,
                    text: text,
                    foreground: true,
                    icon: 'push',
                    color: '#bf0000',
                    vibrate: true,
                    data: {
                        channel: channel,
                        message: message,
                    },
                });
            }
        },

        onClick: (channel, message) => {
            app.action.messageView(channel, message);
        },
    },

    action: {
        index: 0,

        backCallback: null,

        _start: (load) => {
            app.action.backCallback = null;

            app.vue.action = 'preloader';

            const index = ++app.action.index;

            load((name, render) => {
                if (index !== app.action.index) {
                    return false;
                }

                app.vue.data   = render()
                app.vue.action = name;

                return true;
            });
        },

        _save: (save) => {
            app.vue.action = 'preloader';

            save();
        },

        goBack: () => {
            if (app.action.backCallback === null) {
                return false;
            }

            app.action.backCallback();
        },

        channelIndex: () => {
            app.action._start((render) => {
                app.api.channelIndex((channels) => {
                    render('channelIndex', () => {
                        app.action.backCallback = () => {
                            alert.confirm('Close application', 'Are you sure you want to exit?', (button) => {
                                if (button === 'ok') {
                                    navigator.app.exitApp();
                                }
                            })
                        };

                        channels.forEach((channel, idx) => {
                            app.read.sync(channel.id, channel.message_ids);

                            channels[idx].unreadCount = app.read.channelUnreadCount(channel.id, channel.message_ids);
                        });

                        return {
                            channels: channels,
                        };
                    });
                }, (e) => {
                    alert.fatal(JSON.stringify(e));
                });
            });
        },
        channelReadAll: (channel) => {
            alert.confirm('Read all', 'Mark all message as read?', (button) => {
                if (button === 'ok') {
                    app.action._save(() => {
                        app.read.markAsReadAll(channel.id, channel.message_ids);

                        app.action.messageIndex(channel);
                    })
                }
            });
        },
        messageIndex: (channel) => {
            app.action._start((render) => {
                app.api.messageIndex(channel.id, (messages) => {
                    render('messageIndex', () => {
                        app.action.backCallback = () => {
                            app.action.channelIndex();
                        };

                        const message_ids = messages.getColumn('id');

                        app.read.sync(channel.id, message_ids);

                        messages.forEach((message, idx) => {
                            messages[idx].unread = !app.read.isMessageRead(channel.id, message.id);
                        });

                        return {
                            channel: channel,
                            messages: messages,
                        };
                    });
                }, (e) => {
                    alert.error(JSON.stringify(e));

                    app.action.channelIndex();
                });
            })
        },
        messageView: (channel, message) => {
            app.action._start((render) => {
                app.api.messageView(message.id, (message) => {
                    render('messageView', () => {
                        app.action.backCallback = () => {
                            app.action.messageIndex(channel);
                        };

                        app.read.markAsRead(channel.id, message.id);

                        return {
                            channel: channel,
                            message: message,
                        }
                    });
                }, (e) => {
                    alert.error(JSON.stringify(e));

                    app.action.messageIndex(channel);
                });
            });
        },
        channelSubscribe: () => {
            app.action._start((render) => {
                render('channelSubscribe', () => {
                    app.action.backCallback = () => {
                        app.action.channelIndex();
                    };

                    return {
                        title: '',
                    };
                });
            });
        },
        channelSubscribeSave: () => {
            app.action._save(() => {
                app.api.channelSubscribe(app.vue.data.token, (channel) => {
                    alert.success('You\'ve been successfully subscribed to "' + channel.title + '" channel!');

                    app.action.channelIndex();
                }, (e) => {
                    alert.error('Failure subscribe to channel!');

                    app.action.channelIndex();
                });
            });
        },
        channelUnsubscribe: (channel) => {
            alert.confirm('Unsubscribe', 'Are you sure you want to unsubscribe from "' + channel.title + '" channel?', (button) => {
                if (button === 'ok') {
                    app.action._save(() => {
                        app.api.channelUnsubscribe(channel.id, () => {
                            alert.success('You\'ve been successfully unsubscribed from "' + channel.title + '" channel!')

                            app.action.channelIndex();
                        }, (e) => {
                            alert.error('Failure unsubscribe from channel!');

                            app.action.channelIndex();
                        });
                    });
                }
            })
        },
        settings: () => {
            app.action._start((render) => {
                render('settings', () => {
                    app.action.backCallback = () => {
                        app.action.channelIndex();
                    };

                    return {
                        title: app.settings.title,
                    };
                });
            });
        },
        settingsSave: () => {
            app.action._save(() => {
                app.settings.title = app.vue.data.title;

                app.api.settingsUpdate(app.settings, () => {
                    alert.success('Settings save successfully!');

                    app.action.channelIndex();
                }, () => {

                });
            });
        },
    },

    read: {
        list: {},

        isMessageRead: (channel_id, message_id) => {
            return app.read.list[channel_id] && app.read.list[channel_id][message_id];
        },

        channelUnreadCount: (channel_id, message_ids) => {
            if (app.read.list[channel_id]) {
                let count = 0;

                message_ids.forEach(function (message_id) {
                    if (!app.read.list[channel_id][message_id]) {
                        count++;
                    }
                });

                return count;
            } else {
                return message_ids.length;
            }
        },

        sync: (channel_id, message_ids) => {
            if (!app.read.list[channel_id]) {
                app.read.markAsReadAll(channel_id, message_ids);
            } else {
                const readOld = app.read.list[channel_id];

                app.read.list[channel_id] = {};

                message_ids.forEach(function (message_id) {
                    if (readOld[message_id]) {
                        app.read.markAsRead(channel_id, message_id);
                    }
                });

                app.read.save();
            }
        },

        markAsRead: (channel_id, message_id) => {
            if (!app.read.list[channel_id]) {
                app.read.list[channel_id] = {};
            }

            app.read.list[channel_id][message_id] = true;

            app.read.save();
        },

        markAsReadAll: (channel_id, message_ids) => {
            if (!app.read.list[channel_id]) {
                app.read.list[channel_id] = {};
            }

            message_ids.forEach(function (message_id) {
                app.read.list[channel_id][message_id] = true;
            });

            app.read.save();
        },

        save: () => {
            localStorage.setItem('read', JSON.stringify(app.read.list));
        },

        load: () => {
            app.read.list = localStorage.getItem('read');

            if (app.read.list) {
                app.read.list = JSON.parse(app.read.list);
            } else {
                app.read.list = {};
            }
        }
    },

    api: {
        _request: (method, data, success, error) => {
            const url = BASE_URL + 'chat/' + app.settings.identity + '/push/' + method;

            cordova.plugin.http.sendRequest(url, {
                method: 'POST',
                data: data,
            }, success, error);
        },

        settingsView: (success, error) => {
            app.api._request('settings/view', {}, (response) => {
                success(JSON.parse(response.data));
            }, error);
        },
        settingsUpdate: (settings, success, error) => {
            app.api._request('settings/update', settings, success, error);
        },
        channelIndex: (success, error) => {
            app.api._request('channels', {}, (response) => {
                success(JSON.parse(response.data));
            }, error);
        },
        channelSubscribe: (token, success, error) => {
            app.api._request('channel/subscribe', {
                token: token,
            }, (response) => {
                success(JSON.parse(response.data));
            }, error);
        },
        channelUnsubscribe: (channel_id, success, error) => {
            app.api._request('channel/unsubscribe', {
                channel_id: channel_id,
            }, success, error);
        },
        messageIndex: (channel_id, success, error) => {
            app.api._request('channel/messages', {
                channel_id: channel_id,
            }, (response) => {
                success(JSON.parse(response.data));
            }, error);
        },
        messageView: (message_id, success, error) => {
            app.api._request('channel/message/view', {
                message_id: message_id,
            }, (response) => {
                success(JSON.parse(response.data));
            }, error);
        },
    },
};

document.addEventListener('deviceready', app.init, false);
