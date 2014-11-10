(function() {
    var AllStickersController = function ($scope, $http, stickerCollectorFactory) {        
        
        function insertAfter(referenceNode, newNode) {
            referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
        }
        
        
        /*** QUEUE ***/
        var QUEUE = [];
        var test = false;
        /*
            Queue of stickers that will be sent to server. One sticker is sent after the other
        */
        var processingQueue = false; //Keep track if we are already working on the queue.
        
        window.onbeforeunload = confirmExit;
          function confirmExit() {
            if(processingQueue) {
                return "Some stickers are still being saved. You might lose data if you leave now.";
            }
          }
        
        function postCollectedSticker(stickerNr) {
            stickerCollectorFactory.postSticker(stickerNr)
                .success(function(r) {
                    $scope.stickerPendingHTTP[stickerNr] = false;
                    $scope.stickers[stickerNr].collected = true;
                    processingQueue = false;
                    processQueue();
                })
                .error(function (r) {
                    $scope.stickerPendingHTTP[stickerNr] = false;
                    alert('There was an error sending ' + stickerNr + ' to the server.');
                    window.location = '/';
                });
        }
        
        function deleteCollectedSticker(stickerNr) {
            stickerCollectorFactory.deleteSticker(stickerNr)
                .success(function(r) {
                    $scope.stickerPendingHTTP[stickerNr] = false;
                    $scope.stickers[stickerNr].collected = false;
                    $scope.stickers[stickerNr].isDouble = false;
                    processingQueue = false;
                    processQueue();
                })
                .error(function (r) {
                    $scope.stickerPendingHTTP[stickerNr] = false;
                    alert('There was an error sending ' + stickerNr + ' to the server.');
                    window.location = '/';
                });
        }
        
        function postDoubleSticker(stickerNr) {
            stickerCollectorFactory.postDoubleSticker(stickerNr)
                .success(function(r) {
                    $scope.stickerPendingHTTP[stickerNr] = false;
                    $scope.stickers[stickerNr].isDouble = true;
                    $scope.stickers[stickerNr].collected = true;
                    processingQueue = false;
                    processQueue();
                })
                .error(function (r) {
                    $scope.stickerPendingHTTP[stickerNr] = false;
                    alert('There was an error sending ' + stickerNr + ' to the server.');
                    window.location = '/';
                });
        }
        
        function deleteDoubleSticker(stickerNr) {
            stickerCollectorFactory.deleteDoubleSticker(stickerNr)
                .success(function(r) {
                    $scope.stickerPendingHTTP[stickerNr] = false;
                    $scope.stickers[stickerNr].isDouble = false;
                    processingQueue = false;
                    processQueue();
                })
                .error(function (r) {
                    $scope.stickerPendingHTTP[stickerNr] = false;
                    alert('There was an error sending ' + stickerNr + ' to the server.');
                    window.location = '/';
                });
        }
        
        function processQueue () {
            if(!processingQueue && QUEUE.length) {
                processingQueue = true;
                var task = QUEUE.shift();
                var stickerNr = task.stickerNr;
                
                if(task.type === 'collected') {
                    if(task.method === 'post') {
                        postCollectedSticker(stickerNr);
                    } else if (task.method === 'delete') {
                        deleteCollectedSticker(stickerNr);
                    }
                } else if (task.type === 'double') {
                    if(task.method === 'post') {
                        postDoubleSticker(stickerNr);
                    } else if(task.method === 'delete') {
                        deleteDoubleSticker(stickerNr);
                    }
                }
            }
        }
        
        /*** END QUEUE ***/
        
        $scope.nrOfDoubles = function () {
            var n = 0;
            for(var i = 0; i < $scope.stickers.length; i++) {
                if($scope.stickers[i].isDouble) {
                    n++;
                }
            }
            return n;
        };
        
        $scope.nrOfCollected = function () {
            var n = 0;
            for(var i = 0; i < $scope.stickers.length; i++) {
                if($scope.stickers[i].collected) {
                    n++;
                }
            }
            return n;
        };
        
        $scope.stickerPendingHTTP = {};
        // object in form of {123 (stickerNr): true/false}
        // the value of stickerNr is set to true if there is a pending http call
        
        $scope.limit = 30;
        $scope.fbFriends = stickerCollectorFactory.fbFriends; //object in the form of {user_id: picture_url}
        
        $scope.getTabClasses = stickerCollectorFactory.getTabClasses;
        
        $scope.increaseLimit = function () {
            if($scope.limit < 660)
                $scope.limit += 30;
        }
        
        $scope.stickerFilter = function (item) {
            if(!$scope.searchFilter && $scope.searchFilter != '0')
                return true;
            return $scope.searchFilter == item.stickerNr;
        };
        
        
        $scope.loggedIn = function() {
            return stickerCollectorFactory.loggedIn;
        }
        
        function loginUser() {
            stickerCollectorFactory.loginUser(function(){
                $scope.pendingGetAllStickers = true;
                stickerCollectorFactory.getAllStickers()
                .success(function(r) {
                    $scope.stickers = r.stickers;
                    $scope.pendingGetAllStickers = false;
                })
                .error(function (r) {
                    alert("Couldn't fetch your stickers.");
                    $scope.pendingGetAllStickers = false;
                });
            })
        }
        
        window.fbAsyncInit = function() {
            FB.init({
                appId      : stickerCollectorFactory.fbAppID,
                status     : true,
                cookie     : true,
                xfbml      : true
            });
            
            FB.Event.subscribe('auth.authResponseChange', function(response) {
                if (response.status === 'connected') {
                    stickerCollectorFactory.fbAccessToken = response.accessToken;
                    if(!stickerCollectorFactory.serverAuthToken) {
                        loginUser();
                    }
                } else {
                    stickerCollectorFactory.fbAccessToken = '';
                    stickerCollectorFactory.serverAuthToken = '';
                    stickerCollectorFactory.loggedIn = false;
                    $scope.stickers = [];
                    $scope.$apply();
                }
            });
        };
        (function(d){
            var js, id = 'facebook-jssdk', ref = d.getElementsByTagName('script')[0];
            if (d.getElementById(id)) {return;}
            js = d.createElement('script'); js.id = id; js.async = true;
            js.src = "//connect.facebook.net/en_US/all.js";
            ref.parentNode.insertBefore(js, ref);
        }(document));
        
        $scope.fbFriendSwappers = function($event, stickerNr) {
            $scope.loadingSwapperFriends = true;
            $scope.swapperFriends = []; // clear swapper friends and message
            $scope.lastClickedStickerNr = stickerNr;
            var appUsers = '';
            
            $event.currentTarget.innerHTML = 'Loading...';
            
            for(var tmpID in stickerCollectorFactory.fbFriends) {
                appUsers += (',' + tmpID);
            }
            appUsers = appUsers.substring(1); // Remove first char beacause it's a comma
            
            var url = '/users?friends=' + appUsers + '&haveSticker=' + stickerNr +'&at=' + stickerCollectorFactory.serverAuthToken;
            $http.get(url).success(function (r) {
                buildUpSwapperFriends(r, $event);
            });
        };
        
        function buildUpSwapperFriends (r, $event) {
            $scope.swapperFriends = [];
            if(r.status === 'OK') {
                for(var i = 0; i < r.possibleSwappers.length; i++) {
                    var f = {};
                    f.userId = r.possibleSwappers[i].userId;
                    f.stickerNr = r.stickerNr;
                    f.needsFromYou = r.possibleSwappers[i].needsFromYou;
                    f.name = stickerCollectorFactory.fbFriends[f.userId].first_name;
                    f.link = stickerCollectorFactory.fbFriends[f.userId].link;
                    f.profileImg = stickerCollectorFactory.fbFriends[f.userId].picture.data.url;
                    $scope.swapperFriends.push(f);
                }
            }
            $scope.loadingSwapperFriends = false;
            $event.currentTarget.innerHTML = 'Show all';
        }
        
        $scope.collectedCheckboxClicked = function ($event) {
            
            var element = $event.currentTarget;
            var doubleCheckbox = element.parentElement.nextSibling.nextSibling.children[0];
            var stickerNr = $event.currentTarget.value;
            
            if($scope.stickerPendingHTTP[stickerNr]) {
                element.checked = !element.checked;
                return;
            }
            
            if(!element.checked && doubleCheckbox.checked) {
                doubleCheckbox.checked = false;
            }
            
            $scope.stickerPendingHTTP[stickerNr] = true;
            
            if (element.checked) {
                QUEUE.push({"type": "collected",
                            "method": "post",
                            "stickerNr": stickerNr});
            } else {
                QUEUE.push({"type": "collected",
                            "method": "delete",
                            "stickerNr": stickerNr});
            }
            
            if(!processingQueue) {
                processQueue();
            }
        };
        
        $scope.doubleCheckboxClicked = function ($event) {
            var stickerNr = $event.currentTarget.value;
            var element = $event.currentTarget;
            var collectedCheckbox = element.parentElement.previousElementSibling.children[0];
            
            if($scope.stickerPendingHTTP[stickerNr]) {
                element.checked = !element.checked;
                return;
            }
            
            if(element.checked && !collectedCheckbox.checked) {
                collectedCheckbox.checked = true;
            }
            
            $scope.stickerPendingHTTP[stickerNr] = true;
            
            if (element.checked) {
                QUEUE.push({"type": "double",
                            "method": "post",
                            "stickerNr": stickerNr});
            } else {
                QUEUE.push({"type": "double",
                            "method": "delete",
                            "stickerNr": stickerNr});
            }
            
            if(!processingQueue) {
                processQueue();
            }
        };
        
        $scope.swapperFriends = [];
        
        $scope.checkVal = function (b) {
            return b ? "checked='checked'": "";
        };
        
        $scope.stickers = [];
        if(stickerCollectorFactory.serverAuthToken) {
            $scope.pendingGetAllStickers = true;
            stickerCollectorFactory.getAllStickers()
            .success(function(r){
                $scope.stickers = r.stickers;
                $scope.pendingGetAllStickers = false;
            })
            .error(function(r) {
                alert("Couldn't fetch your stickers.");
                $scope.pendingGetAllStickers = false;
            });
        }
    }
    
    
    AllStickersController.$inject = ["$scope", "$http", "stickerCollectorFactory"];
    
    angular.module("stickerCollector")
    .controller("AllStickersController", AllStickersController);
}());