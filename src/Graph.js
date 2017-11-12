const GraphNode = require('./GraphNode');

function Graph( root ) {
  this.root = root;
}

Graph.prototype.getNodes = function () {
	let visited = {};
	let queue = [];
	let nodes = [];

	queue.push( this.root );
	while ( queue.length ) {
		node = queue.shift();
		nodes.push( node );
		children = node.children;
		for ( let i = 0; i < children.length; i++ ) {
			let child = children[i];
			let curId =  child.id;
			if ( !visited[curId] ) { // avoid loops
				visited[curId] = true;
				queue.push( child );
			}
		}
	}
	return nodes;
}

Graph.prototype.getNode = function ( id ) {
	// bfs
	let visited = {};
	let queue = [];
	let node;
	let children;

	if ( !this.root ) {
		return false;
	} else if ( this.root.id === id ) {
		return this.root;
	} else {
		queue.push( this.root );

		while ( queue.length ) {
			node = queue.shift();
			children = node.children;
			for ( let i = 0; i < children.length; i++ ) {
				let child = children[i];
				let curId =  child.id;
				if ( curId === id ) {
					return child;
				} else if ( !visited[curId] ) { // avoid loops
					visited[curId] = true;
					queue.push( child );
				}
			}
		}
		return false;
	}
};

module.exports = Graph;
