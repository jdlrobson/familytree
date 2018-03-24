const Graph = require('./Graph');
const GraphNode = require('./GraphNode');

let trees = [];
const names = [];

function deleteChildOfParent(root, child) {
	root.children.forEach((c, i) => {
		if ( c.id === child.id ) {
			// delete the child to orphan it
			if ( c.children.length ) {
				console.log('Cowardly refusing to delete a node with children' );
			} else {
				root.children.splice( i, 1 );
				console.log('Found and deleted child ' + child.id);
			}
		} else {
			deleteChildOfParent(c, child);
		}
	} );
}
function deleteNodeInTree(tree, node) {
	deleteChildOfParent(tree.root, node);
}

function findNodeAndTree(person) {
	for ( let i = 0; i < trees.length; i++ ) {
		let tree = trees[i];

		// find their father.
		//console.log('search', tree.root.id, 'for ', data.father);
		let node = tree.getNode(person);
		if ( node ) {
			return {
				node,
				tree
			};
		}
	}
}

function findNodeInTrees(person) {
	const needle = findNodeAndTree(person);
	if ( needle && needle.node ) {
		return needle.node;
	}
}

function addToTree( data ) {
	const node = new GraphNode( data.title, data, [] );
	let exists = findNodeInTrees(data.title);
	if ( exists ) {
		console.log('Duplicate name found:' + data.title);
		// copy across fields..
		Object.keys(data).forEach((field) => {
			if ( !exists.data[field] ) {
				console.log('\tCopy field ', field);
				exists.data[field] = data[field];
			} else {
				console.log('\tIgnore field', field);
			}
		});
		return;
	}

	if ( trees.length ) {
		// go through each tree and see if name can be added to one of the trees

		let father = findNodeInTrees(data.father);
		if ( father ) {
			father.addChild( node );
		} else {
			trees.push( new Graph( node ) );
		}
	} else {
		trees.push( new Graph( node ) );
	}

	names.push( data.title.trim() );
}

function mergeTrees() {
	let merged = 0;

	trees.forEach((tree, i) => {
		let rootNode = tree.root;

		if ( rootNode.data.father ) {
			// attempt to find the father in another tree and merge.
			let father = findNodeInTrees( rootNode.data.father );
			if ( father ) {
				father.addChild( rootNode );
				// remove the tree
				trees.splice(i, 1);
				merged++;
			}
		}
	});
	// Try again until no more merges are happening
	if ( merged > 0 ) {
		mergeTrees();
	}
}

function showChildlessRoots() {
	trees.filter(( tree ) => {
		return tree.root.children.length === 0;
	}).forEach((tree) => {
		if ( tree.root.data.father ) {
			console.log( `Title:"${tree.root.data.title}" has no children` );
		}
	})
}

function printPerson(name, mother, indents = 0) {
	const node = findNodeInTrees(name);
	if ( node.data.father ) {
		indents = printPerson(node.data.father, node.data.mother, indents );
	}
	let str = [];
	for ( let i = 0; i < indents; i++ ) {
		str.push('  ');
	}
	str.push(name);
	if ( mother ) {
		str.push( ' & ' + mother );
	} else if ( node.data.spouse ) {
		str.push( ' <3 ' + node.data.spouse );
	}
	console.log(str.join(''));
	return indents + 1;
}

function searchForName( name ) {
	const needle = name.replace(/\(.*\)|[0-9]*/g, '' ).replace( 'Unknown ', '' );
	console.log('S:',needle);
	return names.filter((compare) => {
		//console.log(`|${compare}| with |${needle}|=${compare.indexOf( needle )}`)
		return compare.indexOf( needle ) > -1;
	});
}

function getNodes() {
	var people = [];
	trees.forEach((tree) => {
		people = people.concat( tree.getNodes() );
	});
	return people;
}

function getDepth( root, depth = 0 ) {
  if ( root.children && root.children.length ) {
    depth++;
    const childDepths = root.children.map(( child ) => {
      return getDepth( child, depth );
    });
    return Math.max.apply( Math, childDepths );
  } else {
    return depth;
  }
}

function addNodes( nodes ) {
	nodes.forEach((person) => {
		addToTree(person.data);
	});
	mergeTrees();
}

function all() {
	return trees;
}

function deleteTreeWithRoot( id ) {
  const index = all().findIndex((tree) => {
    return tree.root.id === id;
  } );
  if ( index !== -1 ) {
    console.log('Delete', id, trees.splice(index, 1));
  } else {
    console.log('I can only delete root nodes.');
  }
}

module.exports = {
	findNodeAndTree,
	deleteNodeInTree,
  deleteTreeWithRoot,
	findNodeInTrees,
	all,
  getDepth,
	getNodes,
	names,
	addNodes,
	showChildlessRoots
};