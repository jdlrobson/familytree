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

function updateFields(node) {
  return getUserInput( node.data.title + ': Field to update? (Press enter to update none)' ).then((field) => {
    let msg;
    // @todo: spouse support
    if ( field === 'father' || field === 'mother' ) {
      return getUserInput( 'Enter name to find.' ).then((val) => {
        const otherNode = trees.findNodeInTrees(val);
        if ( otherNode ) {
          console.log(`${field} of ${node.id} set to ${otherNode.id}`);
          node.data[field] = otherNode.id
        } else {
          console.log( `Note: ${val} is not in the tree (but added anyway).` );
          node.data[field] = val;
        }
        return updateFields(node);
      });
    } else if ( field ) {
      return getUserInput( 'Value?' ).then((val) => {
        node.data[field] = val;
        return updateFields(node);
      });
    }
  } );
}

function addData() {
  return getUserInput( 'Which node to update?' ).then((input) => {
    const node = trees.findNodeInTrees(input);
    if ( node ) {
      displayPerson(node);
      return updateFields(node);
    } else {
      const node = trees.findNodeInTrees(input, true);
      if ( node ) {
        return getUserInput( `Did you mean ${node.id}? Press enter for No, otherwise type YES!` ).then((input) => {
          if ( input ) {
            displayPerson(node);
            return updateFields(node);
          } else {
            return addData();
          }
        } );
      }
      console.log('Could not find.')
      return addData();
    }
  });
}

function updateTree(roots) {
  return addData().then(()=>{
    return saveTreeToJSON();
  })
}

function displayPerson(node) {
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

function mergeNode( intoNT, fromNT ) {
  const into = intoNT.node;
  const from = fromNT.node;
  Object.keys( from.data ).forEach((key) => {
    if ( !into.data[key] ) {
      into.data[key] = from.data[key];
      console.log('copy', key, 'to', into.id);
    }
  });
  console.log(from);
  let children = from.children;
  if ( !children.length && from.data.spouse ) {
    let spouses = from.data.spouse.split(',');
    if ( !spouses.length ) {
      console.log( 'Unable to find a spouse to search for children' );
    }
    spouses.forEach((spouse) => {
      const node = trees.findNodeInTrees(spouse);
      if ( node ) {
        children = children.concat( node.children );
      }
    });
  }
  if ( !children.length ) {
    console.log('Unable to find any children');
  }
  // copy across the children if necessary
  children.forEach((child) => {
    if ( child.data.father === from.id ) {
      console.log(`Switched father of ${child.id} from ${from.id} to ${into.id}`);
      child.data.father = into.id;
    }
    if ( child.data.mother === from.id ) {
      console.log(`Switched mother of ${child.id} from ${from.id} to ${into.id}`);
      child.data.mother = into.id;
    }
    console.log(`Adding child to ${into.id}`);
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
    let node = trees.findNodeAndTree(input);
    if ( !node ) {
      console.log('Creating new node... (abort script to cancel)');
      trees.addToTree( { title: input, text: '' } );
      node = trees.findNodeAndTree( input );
    }
    if ( node ) {
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
  return getUserInput( 'Who is the parent?' ).then((parentName) => {
    const parentNode = trees.findNodeInTrees(parentName);
    if ( parentNode ) {
      return getUserInput( 'Who is the child?' ).then((input) => {
        const childNode = trees.findNodeInTrees(input);
        if ( childNode ) {
          parentNode.addChild( childNode );
        } else {
          console.log('Child not found so adding new node...');
          return getUserInput( `Is ${parentName}} the father? (Enter for yes, anything else for no)` ).then((answer) => {
            let data = { text: '' };
            if ( answer ) {
              data.mother = parentName;
            } else {
              data.father = parentName;
            }
            data.title = input;
            const node = trees.addToTree( data );
            displayPerson(node);
            return updateFields(node);
          }).then(() => {
            return saveTreeToJSON();
          })
        }
      });
    } else {
      console.log( 'Parent not known. Adding to tree' );
      const node = trees.addToTree( { text: '', title: parentName } );
      displayPerson(node);
      return updateFields(node).then(() => {
        return saveTreeToJSON();
      } );
    }
  } );
}

function menu() {
  console.log(`
    MENU:
    0: Show all trees with children
    1: Generate HTML for a tree
    2: Update/show a node in a tree
    3: show childless roots
    4: Show seedlings (small trees with depth 1)
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
