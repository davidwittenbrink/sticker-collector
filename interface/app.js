(function() {
    var app = angular.module("stickerCollector", ["ngRoute", 'infinite-scroll']);
    //DONT FORGET THE $INJECT
    
    app.config(function ($routeProvider) {
        $routeProvider
            .when('/',
                  {
                    controller: "AllStickersController",
                    templateUrl: "views/allStickers.html"
                  })
            .when('/friends',
                  {
                    controller: "FriendsController",
                    templateUrl: "views/friends.html"
                  })
            .when('/settings',
                  {
                    controller: "SettingsController",
                    templateUrl: "views/settings.html"
                  })
            .when('/swapRoom',
                  {
                    controller: "SwapRoomController",
                    templateUrl: "views/swapRoom.html"
                  })
            .otherwise({
                    redirectTo: "/"
                  });
    });
}());