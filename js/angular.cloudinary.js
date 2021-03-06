(function (factory) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
        // Register as an anonymous AMD module:
        define([
            'jquery.cloudinary',
            'angular'
        ], factory);
    } else {
        // Browser globals:
        factory(window.jQuery, angular);
    }
}(function ($, angular) {

  var angularModule = angular.module('cloudinary', []);

  var cloudinaryAttr = function(attr){
    if (attr.match(/cl[A-Z]/)) attr = attr.substring(2);
    return attr.replace(/([a-z])([A-Z])/g,'$1_$2').toLowerCase();
  };


  ['Src', 'Srcset', 'Href'].forEach(function(attrName) {
    var normalized = 'cl' + attrName;
    attrName = attrName.toLowerCase();
    angularModule.directive(normalized, ['$sniffer', function($sniffer) {
      return {
        priority: 99, // it needs to run after the attributes are interpolated
        link: function(scope, element, attr) {
          var propName = attrName,
              name = attrName;

          if (attrName === 'href' &&
              toString.call(element.prop('href')) === '[object SVGAnimatedString]') {
            name = 'xlinkHref';
            attr.$attr[name] = 'xlink:href';
            propName = null;
          }

          attr.$observe(normalized, function(value) {
            if (!value)
               return;

            var attributes = {};
            $.each(element[0].attributes, function(){attributes[cloudinaryAttr(this.name)] = this.value});
            value = $.cloudinary.url(value, attributes);
            attr.$set(name, value);

            // on IE, if "ng:src" directive declaration is used and "src" attribute doesn't exist
            // then calling element.setAttribute('src', 'foo') doesn't do anything, so we need
            // to set the property as well to achieve the desired effect.
            // we use attr[attrName] value since $set can sanitize the url.
            if ($sniffer.msie && propName) element.prop(propName, attr[name]);
          });
        }
      };
    }]);
  });

  angularModule.directive('clTransformation', [function() {
    return {
      restrict : 'E',
      transclude : false,
      require: '^clImage',
      link : function (scope, element, attrs, clImageCtrl) {
        var attributes = {};
        $.each(attrs, function(name,value){
          if (name[0] !== '$') {
            attributes[cloudinaryAttr(name)] = value;
          }
        });
        clImageCtrl.addTransformation(attributes);

        scope.$watch(function() {
          var output=[];
          for(var a in attrs.$attr){
            output.push(attrs[a]);
          }
          return output;
        },function(newVal,oldVal){
          clImageCtrl.updateTransformation(newVal,oldVal);
        },true);

      }
    };
}]);

  angularModule.directive('clImage', [function() {
    var Controller = function($scope) {
      this.addTransformation = function(ts) {
        $scope.transformations = $scope.transformations || [];
        $scope.transformations.push(ts);
      }

      this.updateTransformation = function(newTransformation,oldTransformation) {
        if($scope.transformations.length){
          for(var t in $scope.transformations){
            var equal = true;
            var c = 0;
            for(var i in $scope.transformations[t]){
              if(typeof oldTransformation[c] === 'undefined'
                || $scope.transformations[t][i] !== oldTransformation[c] ){
                equal = false
              }
              c++;
            }

            if(equal){
              var c = 0;
              for(var i in $scope.transformations[t]){
                $scope.transformations[t][i] = newTransformation[c];
                c++;
              }
            }
          }
        }
      }
    };
    Controller.$inject = ['$scope'];
    return {
      restrict : 'E',
      replace: true,
      transclude : true,
      template: "<img ng-transclude/>",
      scope: {},
      priority: 99,
      controller: Controller,
      // The linking function will add behavior to the template
      link : function(scope, element, attrs) {
        var attributes = {};
        var publicId = null;

        $.each(attrs, function(name, value){attributes[cloudinaryAttr(name)] = value});

        if (scope.transformations) {
          attributes.transformation = scope.transformations;
        }

        // store public id and load image
        attrs.$observe('publicId', function(value){
          if (!value) return;
          publicId = value
          loadImage();
        });

        // observe and update version attribute
        attrs.$observe('version', function(value){
          if (!value) return;
          attributes['version'] = value;
          loadImage();
        });

        if (attrs.htmlWidth) {
          element.attr("width", attrs.htmlWidth);
        } else {
          element.removeAttr("width");
        }
        if (attrs.htmlHeight) {
          element.attr("height", attrs.htmlHeight);
        } else {
          element.removeAttr("height");
        }
        
        scope.$watch('transformations',function(newVal,oldVal){

          if (scope.transformations) {
            attributes.transformation = scope.transformations;
          }
          if (!attrs.publicId) return;
            loadImage();

        },true);

        var loadImage = function() {
          var url = $.cloudinary.url(publicId, attributes);
          element.attr('src', url);
        }

      }
    };
  }]);
}));
