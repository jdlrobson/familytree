const Graph = require('./Graph');
const GraphNode = require('./GraphNode');

let trees = [];
const names = [];

function findNodeInTrees(person) {
	for ( let i = 0; i < trees.length; i++ ) {
		let tree = trees[i];

		// find their father.
		//console.log('search', tree.root.id, 'for ', data.father);
		let node = tree.getNode(person);
		if ( node ) {
			return node;
		}
	}
}

function addToTree( data ) {
	const node = new GraphNode( data.title, data, [] );

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

function saveEntry(a, json) {
	console.log('save', a, json)
}

function deleteEntry(a) {
	console.log('delete', a );
}
function showOrphans() {
	trees.filter(( tree ) => {
		return tree.root.children.length === 0;
	}).forEach((tree) => {
		if ( tree.root.data.father ) {
			console.log(tree.root.data.title);
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

module.exports = {
	findNodeInTrees,
	all,
  getDepth,
	getNodes,
	names,
	addNodes,
	showOrphans
};