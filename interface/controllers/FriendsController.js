(function() {
    var FriendsController = function ($scope, $http, stickerCollectorFactory) {
        
        $scope.getTabClasses = stickerCollectorFactory.getTabClasses;
        
        $scope.loggedIn = function() {
            if (stickerCollectorFactory.serverAuthToken)
                return true;
            return false;
        }
        
        $scope.inviteFriends = function () {
            FB.ui({
                method: "apprequests",
                message: "Check out this app that helps you swap World Cup stickers!"
            }, function(r) {});
        };
        
        function loginUser() {
            stickerCollectorFactory.loginUser();
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
                    $scope.lastClicked = "";
                    $scope.needsFromYou = [];
                    $scope.needFromHim = [];
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
        
        $scope.lastClicked = "";
        
        $scope.loadPossibleSwaps = function ($event, friendID) {
            $event.currentTarget.innerHTML = 'Loading...';
            var userID = (FB.getAuthResponse() || {}).userID;
            
            var url = "/users/" + userID + "/possibleSwaps?friend=" + friendID + "&at=" + stickerCollectorFactory.serverAuthToken;
            
            $http.get(url).success(function(response) {
                $scope.lastClicked = friendID;
                $scope.needsFromYou = response.needsFromYou;
                $scope.needFromHim = response.needFromHim;
                $event.currentTarget.innerHTML = 'Swaps';
            });
        };
        
        $scope.fbFriends = stickerCollectorFactory.fbFriends;
    }
    
    FriendsController.$inject = ["$scope", "$http", "stickerCollectorFactory"];
    
    angular.module("stickerCollector")
    .controller("FriendsController", FriendsController);
}());