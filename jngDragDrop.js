/**
 * jngDragDrop
 *
 * @version 1.0
 * @license https://raw.githubusercontent.com/JonathanGuo/jngDragDop/master/LICENSE MIT
 * 
 *
 * Use jng-draggable directive to make your element draggable.
 * e.g.
 * <div jng-draggable></div>
 *
 */
(function(window, angular, undefined) {
	'use strict';

	/*
	 * flags
	 */
	var dragging = false;
	var dropped = false;
	var removeDroppedItem = true;

	/*
	 * Data holders
	 */
	var currentData = undefined;
	var currentGroup = null;

	/*
	 * Default settings/variables
	 */
	var defaultAllowedEffect = 'copymove';
	var defaultDropEffect = 'copy';
	var defaultClasses = {
		dragStart: 'jng-drag-started',
		dragOver: 'jnp-drag-enter'
	};

	/*
	 * Global helpers
	 */

	/**
	 * Is the data equal to target or in the target
	 * @param  {Mix} needle
	 * @param  {Mix} haystack
	 * @return {Boolean}
	 */
	function eqOrInCollection(needle, haystack) {
		if( angular.isArray(haystack) ) {
			return haystack.indexOf(needle) !== -1;
		} else {
			return needle === haystack;
		}
	}

	var jngDragDrop = angular.module('jngDragDrop', ['ng']);
	jngDragDrop.directive('jngDraggable', ['$parse',
		function($parse) {
		return {
			restrict: 'A',
			scope: {
				jngDraggableTarget: '=',
				jngDraggableCollection: '=',
			},
			link: function(scope, element, attrs) {

				//set up error message
				var _ff_err_msg = 'At the time this module was developed, Firefox has an issue of dragging button element. Please use div or another element to replace the button for browser compability. https://bugzilla.mozilla.org/show_bug.cgi?id=646823';
				
				//check if draggable is supported by browser
				var _draggable = 'draggable' in document.createElement('div');

				//check if the element or the nesting elements are button
				if(element[0].tagName.toUpperCase() === 'BUTTON' || element[0].nodeName.toUpperCase() === 'BUTTON' || element.find('button').length > 0) {
					console.log(_ff_err_msg);
				}

				//check if native drop and drag API is supported by browser
				if( _draggable ) {
					//enable HTML5 native draggable feature
					element.attr('draggable',true);
				}

				/**
				 * Listen on dragstart event
				 * 
				 * @param  {object} event
				 * @return {[void]}
				 */
				element.on('dragstart', function(event) {

					//get original mouse event
					var event = event.originalEvent || event;

					//set current data and group
					currentData = angular.copy(scope.jngDraggableTarget);
					currentGroup = attrs.jngGroup;
					var isItemDragged = attrs.jngDraggedItem === undefined ? false : Boolean(attrs.jngDraggedItem);
					var jsonData = angular.toJson({data: angular.copy(currentData), group: currentGroup, draggedItem: isItemDragged});

					//set data transfer
					event.dataTransfer.setData('Text', jsonData);
					event.dataTransfer.effectAllowed = attrs.jngEffectAllowed || defaultAllowedEffect;
					var dragStartClass = attrs.jngDragStartClass ? attrs.jngDragStartClass : defaultClasses.dragStart;

					//turn on dragging flag
					dragging = true;
					//reset dropped flag
					dropped = false;
					//reset remove dropped item flag
					removeDroppedItem = true;

					scope.$apply(function() {
						element.addClass(dragStartClass);
					});

					//invoke callback
					invokeCallbackFunction(attrs.jngOnDragStart, event, currentData);

					if( event.stopPropagation ) {
						event.stopPropagation();
					}
				});

				element.on('dragend', function(event) {

					var dragStartClass = attrs.jngDragStartClass ? attrs.jngDragStartClass : defaultClasses.dragStart;
					scope.$apply(function() {
						element.removeClass(dragStartClass);
					});

					if( !dropped ) return false;

					var event = event.originalEvent || event;
					switch(event.dataTransfer.dropEffect) {
						case 'move':
							if( removeDroppedItem ) {
								removeOriginalData(element);
							}
							break;
						case 'copy':
						default:
							break;
					}


					//invoke callback
					invokeCallbackFunction(attrs.jngOnDragEnd, event, currentData);
					
					if( event.stopPropagation ) {
						event.stopPropagation();
					}
					if( event.preventDefault ) {
						event.preventDefault();
					}
				});

				/**
				 * Invoke callback function
				 * @param  {string} func  Function
				 * @param  {object} event Event
				 * @param  {JSON} data
				 * @return {function}
				 */
				function invokeCallbackFunction(func, event, data) {
					return $parse(func)(scope, {event: event, data: data || undefined});
				}

				/**
				 * Remove original data
				 * @param  {Mix} element
				 * @return {Void}
				 */
				function removeOriginalData(element) {
					scope.$apply(function() {
						if( angular.equals(currentData, scope.jngDraggableCollection) ) {
							//if draggable collection is an object which equals to currentData
							scope.jngDraggableCollection = null;
						} else if( angular.isArray(scope.jngDraggableCollection) ) {
							//if draggable collection is an array
							for( var i in scope.jngDraggableCollection ) {
								if( angular.equals(currentData, scope.jngDraggableCollection[i]) ) {
									scope.jngDraggableCollection.splice(i, 1);
									break;
								} else if(angular.isArray(scope.jngDraggableCollection[i])) {
									//if collection has nested collection/array
									var index = scope.jngDraggableCollection[i].indexOf(currentData);
									if( index !== -1 ) {
										scope.jngDraggableCollection[i].splice(index, 1);
										break;
									}
								}
							}
						} 
					});
				};
			}
		};
	}]);

	jngDragDrop.directive('jngDroppable', ['$parse',
		function($parse) {
		return {
			restrict: 'A',
			scope: {
				jngDropSourceCollection: '=',
				jngDropTarget: '=',
			},
			link: function(scope, element, attrs) {

				/**
				 * Listen on dragover event
				 * @param  {object}   event
				 * @return {void}
				 */
				element.on('dragenter', function(event) {
                    if (event.preventDefault) {
                        event.preventDefault();
                    }
                    if (event.stopPropagation) {
                        event.stopPropagation();
                    }
					//return false to make browser to fire drop event
					return false;
				});

				/**
				 * Listen on dragover event
				 * @param  {object} event)
				 * @return {boolean}
				 */
				element.on('dragover', function(event) {

					//set up dropEffect
					var event = event.originalEvent || event;
					event.dataTransfer.dropEffect = attrs.jngDropEffect || defaultDropEffect;

                    if( droppable(currentData, currentGroup) ) {
	                    //add class
						scope.$apply(function() {
							if( !(element.hasClass(attrs.jngDragOverClass || defaultClasses.dragOver)) ) {
								element.addClass(attrs.jngDragOverClass || defaultClasses.dragOver);
							}
						});
                    }

					//return false to make browser to fire drop event
					return false;
				});

				/**
				 * Listen on drag leave eevnt
				 * @param  {object} event)
				 * @return {boolean}
				 */
				element.on('dragleave', function(event) {
                    if (event.preventDefault) {
                        event.preventDefault();
                    }
                    if (event.stopPropagation) {
                        event.stopPropagation();
                    }

                    removeDragoverClass(element);

					return false;
				});

				/**
				 * Listen on drop event
				 * @param  {object} event)
				 * @return {void}
				 */
				element.on('drop', function(event) {
                    if (event.preventDefault) {
                        event.preventDefault();
                    }
                    if (event.stopPropagation) {
                        event.stopPropagation();
                    }

                    //get event
					var event = event.originalEvent || event;
					try {
						//get data
						var receiveddata = angular.fromJson(event.dataTransfer.getData('Text'));
						var data = receiveddata.data;
						var group = receiveddata.group;

						if( droppable(data, group) ) {
							//if droppable
							//get index of current element
							var index = getElementIndex();

							//if jngDropTarget is set
							if( scope.jngDropTarget !== undefined ) {
								scope.$apply(function() {
									if( angular.isArray(scope.jngDropTarget) ) {
										//if jngDropTarget is an array

										if( scope.jngDropTarget[index] !== undefined  && scope.jngDropTarget[index] !== null) {
											if( scope.jngDropSourceCollection !== undefined && angular.isArray(scope.jngDropSourceCollection) ) {
												scope.jngDropSourceCollection.push(angular.copy(scope.jngDropTarget[index]));
											}
										}
										if( index !== -1 ){
											var isItemDragged = receiveddata.draggedItem === undefined ? false : Boolean( receiveddata.draggedItem );
											//if item is found from elements
											if( Boolean(attrs.jngSourceDroppingArea) && !isItemDragged ) {
												removeDroppedItem = false;
											} else {
												scope.jngDropTarget[index] = data;
											}
										} else {
											scope.jngDropTarget.push(data);
										}
									} else {
										if( angular.equals(scope.jngDropTarget, data) ) {
											removeDroppedItem = false;
										} else {
											//if jngDropTarget is not an array
											if( scope.jngDropTarget !== undefined && scope.jngDropTarget !== null ) {
												if( scope.jngDropSourceCollection !== undefined &&  angular.isArray(scope.jngDropSourceCollection) ) {
													scope.jngDropSourceCollection.push(angular.copy(scope.jngDropTarget));
												}
											}
											scope.jngDropTarget = data;
										}
									}
								});
							}

							//set dropped flag
							dropped = true;

							//invokes callback
							invokeCallbackFunction(attrs.onJngDropped, event, data, index);
						}
					} catch (e) {
						//do whatever u want with the error.
						// console.log(e);
					}

                    removeDragoverClass(element);
				});

				/*
				 * Support functions
				 */
				/**
				 * Is the element droppable
				 * @param  {Mix} data
				 * @param  {String} group
				 * @return {Boolean}
				 */
				function droppable(data, group) {
					//set default result to false
					var result = false;

					//check dragging flag
					if( !dragging ) return false;

					//check currentData
					// if( currentData === null || currentData === undefined ) {
					if( currentData === undefined ) {
						return false;
					}

					//check group
					if( attrs.jngGroup !== null && attrs.jngGroup !== undefined && group !== attrs.jngGroup ) {
						return false;
					}

					result = angular.equals(data, currentData);

					// if(data !== currentData) {
					// 	result = false;
					// } else {
					// 	if( angular.isArray(scope.jngDropSourceCollection) ) {
					// 		console.log('is array');
					// 		for( var i in scope.jngDropSourceCollection ) {
					// 			result = eqOrInCollection(data, scope.jngDropSourceCollection[i]);
					// 			if( result === true ) {
					// 				break;
					// 			}
					// 		}
					// 	} else {
					// 		console.log('not array');
					// 		result = data === scope.jngDropSourceCollection;
					// 	}
					// }

					return result;
				}

				/**
				 * Remove dragover class
				 * @param  {object} element DOM element
				 * @return {void}
				 */
				function removeDragoverClass(element) {
					scope.$apply(function() {
						element.removeClass(attrs.jngDragOverClass || defaultClasses.dragOver);
					});
				}

				/**
				 * Invoke callback function
				 * @param  {string} func  Function
				 * @param  {object} event Event
				 * @param  {JSON} data
				 * @param  {integer} index
				 * @return {function}
				 */
				function invokeCallbackFunction(func, event, data, index) {
					return $parse(func)(scope, {event: event, data: data || undefined, index: index || undefined});
				}

				/**
				 * Get element index
				 * @return {integer}
				 */
				function getElementIndex() {
					if( attrs.jngSourceDroppingArea !== undefined && Boolean(attrs.jngSourceDroppingArea) ) {
						if( angular.isArray(scope.jngDropTarget) ) {
							// return scope.jngDropTarget.indexOf( currentData );
							var index = -1;
							for(var i in scope.jngDropTarget) {
								if( angular.equals(currentData, scope.jngDropTarget[i]) ) {
									index = i;
									break;
								}
							}
							return index;
						} else {
							return -1;
						}
					} else {
						return $('[jng-droppable][jng-group="'+ attrs.jngGroup + '"]').index(element[0]);
					}
      			}
			}
		};	
	}]);
})(window, window.angular);