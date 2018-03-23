function GraphNode( id, data, children ) {
  this.id = id;
  this.data = data;
  this.children = [];
  (children || []).forEach((child) => this.addChild(child));
}

GraphNode.prototype.addChild = function ( node ) {
  const exists = this.children.findIndex( (child) => {
    return child.id === node.id;
  });
  if ( exists === -1 ) {
    this.children.push( node );
  } else {
    console.log('Already a child');
  }
};

module.exports = GraphNode;
