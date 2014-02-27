var metapolatortestApp = angular.module('metapolatortestApp', []);

metapolatortestApp.controller('SliderCtrl', ['$scope',
                                             'instanceListService',
    function($scope, instanceListService){
        $scope.sliders = [
            {
                name:'width',
                id:'glyphSlider',
                min: 0,
                max: 1,
                selection:'after',
                canvasConfig: 'glyphConfig',
                canvas: 'glyph',
                interpolationValueAB: 0.2,
                formatter: function(value){
                    return Number(value).toFixed(2);
                }
            },
            {
                name:'width',
                id:'wordSlider',
                min: 0,
                max: 1,
                selection:'after',
                canvasConfig: 'wordConfig',
                interpolationValueAB: 0.2,
                interpolationValueAD: 0.2,
                formatter: function(value){
                    return Number(value).toFixed(2);
                }
            },
            {
                name:'width',
                id:'paragraphSlider',
                min: 0,
                max: 1,
                selection:'after',
                canvasConfig: 'paragraphGlyphConfig',
                interpolationValueAB: 0.2,
                interpolationValueAD: 0.2,
                formatter: function(value){
                    return Number(value).toFixed(2);
                }
            }
        ];
        var objectToFunc = function(object, funct) {
            for (key in object){
                funct[key] = object[key];
            }
            return funct;
        }
        angular.forEach($scope.sliders, function(slider, index){
            var gui = new dat.GUI();
            var sliderFunct = objectToFunc(slider, new Function());
            var controllers = [];
            var sliderEl = document.getElementById(slider.id);
            var canvasEl = document.getElementById(slider.canvas);
            angular.forEach(slider, function(key, index){
                if (index.indexOf('interpolationValue') > -1) {
                    controllers.push(gui.add(sliderFunct, index, slider.min, slider.max));
                }
            });
            angular.forEach(controllers, function(control, index){
                control.onChange(function(value){
                    var canvasModel = instanceListService.getInstance(slider.canvasConfig);
                    canvasModel[control.property] = value;
                    canvasModel.interpolate();
                });
            });

            sliderEl.appendChild(gui.domElement);

        });

}]);

metapolatortestApp.controller('canvasCtrl', ['$scope',
                                            'instanceListService',
    function($scope, instanceListService) {
        $scope.canvasConfig = {};
        $scope.init = function (model) {
                var instanceObj = Instance(model);
                if (instanceObj.loaded()){
                    instanceObj.interpolate();
                }
                instanceListService.addInstance(instanceObj);
            return instanceObj;
        }
        $scope.watchConf = function(instanceObj, newVal){
            if (instanceObj.loaded()) {
                    instanceObj = newVal;
                    instanceObj.interpolate();
                }
            }
    }]);

metapolatortestApp.controller('glyphCtrl', ['$scope',
                                            'instanceListService',
    function($scope, instanceListService) {
        $scope.glyphConfig = {
                name: 'glyphConfig',
                canvas: '#glyph',
                slider: '#sliderAB',
                fontslist: [
                'app/fonts/RobotoSlab_Thin.otf',
                'app/fonts/RobotoSlab_Bold.otf',
                'app/fonts/RobotoSlab_Thin.otf'
                ],
                text: 'a',
                fontSize: 400,
                lineHeight: 215,
                interpolationValueAB: 0.2,
            };
        var glyphInstance = $scope.init($scope.glyphConfig);
        $scope.$watchCollection('glyphConfig', function(newVal, oldVal){
            $scope.watchConf(glyphInstance, newVal);
        });
    }]);
metapolatortestApp.controller('wordCtrl', ['$scope',
                                            'instanceListService',
    function($scope, instanceListService) {
        $scope.wordConfig = {
            name: 'wordConfig',
            canvas: '#glyphsWord',
            slider: '#sliderAB',
            fontslist: [
                'app/fonts/Roboto-Regular.otf',
                'app/fonts/Roboto-Bold.otf',
                'app/fonts/Roboto-Regular-space.otf'
            ],
            text: 'Hanna',
            fontSize: 80,
            lineHeight: 110,
            interpolationValueAB: 0.2,
            interpolationValueAC: 0.2,
        };
        var glyphInstance = $scope.init($scope.wordConfig);
        $scope.$watchCollection('glyphConfig', function(newVal, oldVal){
            $scope.watchConf(glyphInstance, newVal);
        });
    }]);

metapolatortestApp.controller('paragraphCtrl', ['$scope',
                                                'instanceListService',
    function($scope, instanceListService) {
        $scope.paragraphGlyphConfig = {
            name: 'paragraphGlyphConfig',
            canvas: '#paragraphWord',
            slider: '#sliderAB',
            fontslist: [
                'app/fonts/RobotoSlab_Thin.otf',
                'app/fonts/RobotoSlab_Bold.otf',
                'app/fonts/RobotoSlab_Thin_Space.otf'
            ],
            text: 'Donald Ervin Knuth (born January 10, 1938) is an American computer scientist, mathematician, and Professor Emeritus at Stanford University. He is the author of the multi-volume work The Art of Computer Programming. Knuth has been called the "father" of the analysis of algorithms. He contributed to the development of the rigorous analysis of the computational complexity of algorithms and systematized formal mathematical techniques for it. In the process he also popularized the asymptotic notation. In addition to fundamental contributions in several branches of theoretical computer science, Knuth is the creator of the TeX computer typesetting system, the related METAFONT font definition language and rendering system, and the Computer Modern family of typefaces.',
            fontSize: 20,
            lineHeight: 32,
            width: 690,
            height: 400,
            linebreaks: true,
            interpolationValueAB: 0.2,
            interpolationValueAC: 0.2,
        };
        var glyphInstance = $scope.init($scope.paragraphGlyphConfig);
        $scope.$watchCollection('glyphConfig', function(newVal, oldVal){
            $scope.watchConf(glyphInstance, newVal);
        });
    }]);

metapolatortestApp.service('instanceListService', function(){
   var list = {};
   return {
       addInstance : function (instance) {
           list[instance.name] = instance;
       },
       getInstance: function (name){
        return list[name]
    }
   }
});