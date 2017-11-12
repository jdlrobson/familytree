function GraphNode( id, data, children ) {
  this.id = id;
  this.data = data;
  this.children = children || [];
}

GraphNode.prototype.addChild = function ( node ) {
	this.children.push( node );
};

module.exports = GraphNode;
