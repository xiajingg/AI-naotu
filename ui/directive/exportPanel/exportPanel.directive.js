angular.module('kityminderEditor')
    .directive('exportPanel', function() {
        return {
            restrict: 'E',
            templateUrl: 'ui/directive/exportPanel/exportPanel.html',
            scope: {
                minder: '='
            },
            replace: true,
            link: function($scope) {
                $scope.exportKm = function() {
                    var json = $scope.minder.exportJson();
                    var blob = new Blob([JSON.stringify(json)], {
                        type: 'application/json'
                    });
                    var url = URL.createObjectURL(blob);
                    var link = document.createElement('a');
                    link.href = url;
                    link.download = 'mindmap.km';
                    link.click();
                };

                $scope.exportPng = function() {
                    $scope.minder.exportData('png').then(function(data) {
                        var link = document.createElement('a');
                        link.href = data;
                        link.download = 'mindmap.png';
                        link.click();
                    });
                };
            }
        };
    });