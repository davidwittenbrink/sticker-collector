(function(){
    var stickerCollectorFactory = function($http) {
        
        var factory = {};
        
        factory.fbAppID = '463144913817112';
        
        factory.fbFriends = {};
        factory.serverAuthToken = ''; //This is the auth token from our server, not from Facebook
        factory.fbUserId = '';
        factory.fbAccessToken = '';
        
        factory.getTabClasses = function (tabHash) {
            if(tabHash === window.location.hash) {
                return ['tab', 'active-tab'];
            }
            return "tab";
        };
        
        factory.loggedIn = false;
        
        factory.getAllStickers = function() {
            var friends = "";
            for(friendID in factory.fbFriends) {
                friends += ',' + friendID;
            }
            friends = friends.substring(1); // remove first char because it's a comma
            return $http.get('/users/' + 
                             factory.fbUserId + 
                             '/stickers/all?at=' + 
                             factory.serverAuthToken + 
                             '&friends=' + friends);
        }
        
        factory.postSticker = function(stickerNr) {
            return $http.post('/users/' + factory.fbUserId + '/stickers/' + stickerNr,
                              {'at' : factory.serverAuthToken});
        };
        
        factory.deleteSticker = function (stickerNr) {
            return $http.delete('/users/' + factory.fbUserId + 
                                '/stickers/' + stickerNr + 
                                '?at=' + factory.serverAuthToken);
        }
        
        factory.postDoubleSticker = function(stickerNr) {
            return $http.post('/users/' + factory.fbUserId + '/stickers/doubles/' + stickerNr,
                              {'at' : factory.serverAuthToken});
        };
        
        factory.loginUser = function (callbackFn) {
            if(factory.serverAuthToken) {
                return;
            }
            var fbURL = '/me/friends?fields=installed,picture.height(30).width(30),first_name,name,link';
            FB.api(fbURL, function(r) {
                for(var i = 0; i < r.data.length; i++) {
                    if(r.data[i].installed) {
                        factory.fbFriends[r.data[i].id] = r.data[i];
                    }
                }
                $http.get('/token').success(function (response) {
                    if(response.status === 'OK') {
                        factory.serverAuthToken = response.authToken;
                        factory.fbUserId = response.authToken.split('-')[0];
                        if(callbackFn) {
                            callbackFn();
                        }
                        factory.loggedIn = true;
                    } else {
                        console.log(response.msg);
                        factory.loggedIn = false;
                    }
                });
            });
        };
        
        factory.deleteDoubleSticker = function (stickerNr) {
            return $http.delete('/users/' + factory.fbUserId + 
                                '/stickers/doubles/' + stickerNr + 
                                '?at=' + factory.serverAuthToken);
        }
        
        return factory;
    }
    
    stickerCollectorFactory.$inject = ['$http'];
    
    angular.module('stickerCollector')
    .factory('stickerCollectorFactory', stickerCollectorFactory);
}());