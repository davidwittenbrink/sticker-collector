(function() {
    var SettingsController = function ($scope, $http, stickerCollectorFactory) {
        
        $scope.pendingStickerReset = false;
        
        $scope.resetStickers = function() {
            if(window.confirm('Are you sure you want to reset your stickers? This can not be undone.')) {
                $scope.pendingStickerReset = true;
                var url = ('/users/' + 
                           stickerCollectorFactory.fbUserId +
                           '/stickers/all?at=' +
                           stickerCollectorFactory.serverAuthToken);
                $http.delete(url)
                .success(function(){
                    $scope.pendingStickerReset = false;
                })
                .error(function(r) {
                    $scope.pendingStickerReset = false;
                    alert("Couldn't reset your stickers.");
                    console.log(r);
                });
            }
        };
        
        $scope.revokeFacebookLogin = function () {
            if(window.confirm('Are you sure you want to delete your Account? This can not be undone.')) {
                FB.api("/me/permissions","DELETE",function(response){
                    if(response == true) {
                        var url = ('/users/' + 
                                   stickerCollectorFactory.fbUserId + 
                                   '?at=' + 
                                   stickerCollectorFactory.serverAuthToken);
                        $http.delete(url).success(function (r) {
                            window.location = '';
                        }
                                                 ).error(function (r) {
                            alert("Couldn't delete your account.");
                            console.log(r);
                        });
                    }
                });
            }
        };
        
        $scope.loggedIn = function () {
            return stickerCollectorFactory.loggedIn;
        };
        
        $scope.getTabClasses = stickerCollectorFactory.getTabClasses;
        
        function init() {
            if(!stickerCollectorFactory.loggedIn)
                window.location = '/';
        }
        
        init();
        
    };
    
    SettingsController.$inject = ["$scope", "$http", "stickerCollectorFactory"];
    
    angular.module("stickerCollector")
    .controller("SettingsController", SettingsController);
}());