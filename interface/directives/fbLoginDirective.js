angular.module("stickerCollector").directive("fbLogin", function($rootScope) {
    return function (scope, iElement, iAttrs) {
        if (FB) {
            FB.XFBML.parse(iElement[0]);
        }
    };
}