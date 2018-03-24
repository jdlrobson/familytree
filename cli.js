const fs = require( 'fs' );
const trees = require( './src/trees' );
const loadTreeFromJSON = require( './src/treeFromJSON' );
const saveTreeToHTML = require('./src/html');
const util = require('util');
const SORT_TREES_BY_DEPTH = ( tree, otherTree) => {
  if ( tree._depth === otherTree._depth ) {
    return tree.root.data.title.toLowerCase() > otherTree.root.data.title.toLowerCase() ? -1 : 1;
  } else {
    return tree._depth > otherTree._depth ? -1 : 1;
  }
};

function saveTreeToJSON() {
  console.log('Saving...');
  return new Promise( (resolve, reject ) => {
    fs.writeFile( 'tree.json', JSON.stringify( trees.getNodes() ), 'utf-8', function ( err ) {
      if ( err ) {
        reject();
      } else {
        resolve();
      }
    } );
  } );
}

function getRoots() {
  return trees.all().filter(( tree ) => {
    return tree.root.children.length > 0;
  });
}

const FILTER_DEPTH_1 = (tree) => {
  return tree._depth > 1;
};

function showIndex(listOfTrees, filter = FILTER_DEPTH_1) {
  const filteredSortedTrees = listOfTrees.map((tree) => {
    tree._depth = trees.getDepth( tree.root );
    return tree;
  }).filter(filter).sort(SORT_TREES_BY_DEPTH)
  filteredSortedTrees.forEach((tree, i) => {
    const dob = tree.root.data.dob || '????'
    console.log(`Tree#${i}`, tree.root.id,
      `born ${dob.substr(0, 4)} (${tree.root.children.length} children, depth=${tree._depth})`);
  });
  return filteredSortedTrees;
}

function getUserInput( msg ) {
  return new Promise( ( resolve, reject ) => {
    console.log(msg);
    process.stdin.setEncoding('utf8');
    process.stdin.once('data', function (text) {
      resolve( util.inspect(text).replace( /'([^\n]*)'/g, '$1' ).replace( '\\n', '' ).trim() );
    });
  })
}

function requestTreeHTML(roots) {
  return getUserInput( 'Which tree do you want to generate HTML for? (type its number or * for all)' ).then((input) => {
    if (input === '*' ) {
      roots.forEach((tree) => {
        saveTreeToHTML(tree.root.id, [tree]);
      });
      saveTreeToHTML('index', roots.sort(SORT_TREES_BY_DEPTH), true);
    } else {
      const choice = parseInt(input, 10);
      const tree = roots[choice];
      saveTreeToHTML(tree.root.id, [tree]);
    }
  });
}

function addData() {
  return getUserInput( 'Which node to update?' ).then((input) => {
    const node = trees.findNodeInTrees(input);
    if ( node ) {
      return getUserInput( 'Field to update?' ).then((field) => {
        let msg;
        if ( field === 'father' || field === 'mother' ) {
          return getUserInput( 'Enter name to find.' ).then((val) => {
            const otherNode = trees.findNodeInTrees(val);
            if ( otherNode ) {
              console.log(`${field} of ${node.id} set to ${otherNode.id}`);
              node.data[field] = otherNode.id
            } else {
              console.log( `Note: ${val} is not in the tree.` );
              node.data[field] = val;
            }
          });
        } else {
          return getUserInput( 'Value?' ).then((val) => {
            node.data[field] = val;
          });
        }
      } );
    } else {
      return addData();
    }
  });
}

function updateTree(roots) {
  return addData().then(()=>{
    return saveTreeToJSON();
  })
}

function findPerson() {
  return getUserInput( 'Who to find?' ).then((input) => {
    const node = trees.findNodeInTrees(input);
    if ( node ) {
      const fatherId = node.data.father;
      const motherId = node.data.mother;
      const father = trees.findNodeInTrees( fatherId );
      const mother = trees.findNodeInTrees( motherId );
      console.log(node.id);
      Object.keys(node.data).forEach((field) => {
        console.log('\t', field + ':' + node.data[field])
      });
      console.log('Mother:', motherId, mother ? '' : '<Not found>');
      console.log('Father:', fatherId, father ? '' : '<Not found>');
      console.log('Spouse:', node.data.spouse);
      console.log('Children:', node.children.map((child) => child.id).join(','));
    }
  })
}

function mergeNode( intoNT, fromNT ) {
  const into = intoNT.node;
  const from = fromNT.node;
  Object.keys( from.data ).forEach((key) => {
    if ( !into.data[key] ) {
      into.data[key] = from.data[key];
      console.log('copy', key, 'to', into.id);
    }
  });
  // copy across the children if necessary
  from.children.forEach((child) => {
    if ( child.data.father === from.id ) {
      child.data.father = into.id;
    }
    if ( child.data.mother === from.id ) {
      child.data.mother = into.id;
    }
    into.addChild( child );
  });
  console.log(`Deleting node ${from.id} from its tree ${fromNT.tree.root}`);
	trees.deleteNodeInTree(fromNT.tree, from);
  from.children = [];
  delete from.data.father;
  delete from.data.mother;
}

function findAndMergeNodes() {
  return getUserInput( 'Who to merge into?' ).then((input) => {
    const node = trees.findNodeAndTree(input);
    if ( node ) {
      console.log('Found that one...');
      return getUserInput( 'Who is the duplicate?' ).then((input) => {
        const node2 = trees.findNodeAndTree(input);
        mergeNode( node, node2 );
        return saveTreeToJSON();
      });
    }
  } );
}

function findAndDeleteNode() {
  return getUserInput( 'Who to delete?' ).then((input) => {
    const node = trees.findNodeInTrees(input);
    if ( node ) {
      trees.deleteTreeWithRoot( node.id );
    }
    return saveTreeToJSON();
  } );
}

function findAndAddChild() {
  return getUserInput( 'Who is the parent?' ).then((input) => {
    const parentNode = trees.findNodeInTrees(input);
    if ( parentNode ) {
      return getUserInput( 'Who is the child?' ).then((input) => {
        const childNode = trees.findNodeInTrees(input);
        if ( childNode ) {
          parentNode.addChild( childNode );
        }
      });
    }
    return saveTreeToJSON();
  } );
}

function menu() {
  console.log(`
    MENU:
    0: Show all trees with children
    1: Generate HTML for a tree
    2: Update a node in a tree
    3: show childless roots
    4: Show seedlings (small trees with depth 1)
    5: Find and print person
    6: Merge nodes
    7: Delete note
    8: Add child
  `);
  return getUserInput( 'What to do?' ).then((input) => {
    const choice = parseInt(input, 10);
    const roots = getRoots();
    switch (choice) {
      case 0:
        showIndex(roots);
        break;
      case 1:
        return requestTreeHTML(showIndex(roots, (tree)=>true)).then(()=>saveTreeToJSON());
      case 2:
        return updateTree(roots);
      case 3:
        trees.showChildlessRoots();
        break;
      case 4:
        showIndex(roots, (tree)=>tree._depth === 1);
        break;
      case 5:
        return findPerson();
      case 6:
        return findAndMergeNodes();
      case 7:
        return findAndDeleteNode();
      case 8:
        return findAndAddChild();
      default:
        console.log('Huh?');
    }
  } ).then( menu );
}
loadTreeFromJSON().then(() => {
  console.log('***');
  console.log( `Loaded ${trees.all().length} trees of ${trees.names.length} names.` );

  saveTreeToJSON();
  menu();
});
