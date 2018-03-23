const trees = require( './src/trees' );
const fs = require( 'fs' );
const util = require('util');
const FIELD_BLACKLIST = [
  'changecount', 'type', 'tags', 'created', 'modified',
  'modifier', 'vismoxy'
];

const FIELD_RENDER_BLACKLIST = FIELD_BLACKLIST.concat(
  [
    'father', 'mother', 'title', 'sex', 'spouse', 'text'
  ]
);
function saveTreeToJSON() {
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

function loadTreeFromJSON() {
  return new Promise( ( resolve ) => {
    fs.readFile( 'tree.json', 'utf-8', function ( err, text ) {
      trees.addNodes( JSON.parse( text ) );
      resolve();
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
  }).filter(filter).sort((tree, otherTree) => {
    if ( tree._depth === otherTree._depth ) {
      return tree.root.data.title.toLowerCase() > otherTree.root.data.title.toLowerCase() ? -1 : 1;
    } else {
      return tree._depth > otherTree._depth ? -1 : 1;
    }
  } )
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

function date(str) {
  if ( !str ) {
    return '??';
  } else {
    const y = str.substr(0, 4);
    const m = str.substr(6, 2);
    const d = str.substr(8, 2);

    return y != '0000' ? y : '??';
  }
}

function dl(data) {
  const labels = {
    dob: 'date of birth',
    placeofbirth: 'place of birth',
    occupation: 'occupation',
    dod: 'date of death',
    causeofdeath: 'cause of death',
    placeofdeath: 'place of death'
  };
  const items = Object.keys(data).filter((key) => FIELD_RENDER_BLACKLIST.indexOf(key) === -1).map((key) => {
    return `\t\t<dt>${labels[key] || key}</dt><dd>${data[key]}</dd>`;
  }).join('\n');

  return `\t<dl class="person__data">
  ${items}
  </dl>
  `;
}

function fragment(id) {
  return encodeURIComponent(id.replace(/ /g, '_' ));
}

function generateHTML(node, depth = 0) {
  const data = node.data;
  const tabs = Array(depth+2).join('\t');
  let spouseHTML = '';
  const modifierClass = data.sex ? ( data.sex === 'F' ? 'female' : 'male' ) : 'unknown';
  const spouses = data.spouse ? data.spouse.split(',') : [];
  const partners = [...
    new Set(
      node.children.map((child) => child.data.mother)
      .concat(spouses)
    )
  ].filter(partner=>partner !== undefined);
  let html =
`<div class="person person__${modifierClass}">
  <div class="person__content">
    <h3 class="person__heading" id="${fragment(node.id)}">${node.id} (${date(data.dob)}-${date(data.dod)})</h3>
    <p class="person__text">${node.data.text}</p>
    ${dl(data)}
`;
  const children = node.children;
  partners.forEach((partner) => {
    html += `<p class="person__spouse">Children with <a href="#${fragment(partner)}">${partner}</a></p><div class="person__children">
    `;
    const theirChildren = children.filter((node)=>node.data.mother === partner);
    if ( theirChildren.length ) {
      theirChildren.forEach((child) => {
        html += generateHTML(child, depth+1);
      });
    } else {
       html += 'No children';
    }
    html += '</div>';
  });
  if ( !partners.length ) {
    // TODO: Find the spouse and join their tree!
    html += 'No partner';
  }

  const unaccountedChildren = children.filter((node)=>!node.data.mother);
  if ( unaccountedChildren.length ) {
    html += `<p class="person__spouse">Children with unknown partner</p><div class="person__children">`;
    
    unaccountedChildren.forEach((child) => {
      // set for next time
      if ( partners[0] ) {
        console.log(`FIX: Setting mother of ${child.id} to ${partners[0]}`)
        child.data.mother = partners[0];
      }
      html += generateHTML(child, depth+1);
    });
    html += '</div>';
  }
  html += `</div></div>`;
  return html;
}

function treeToHTML(tree) {
  return `<h2>Tree of ${tree.root.id}</h2>
${generateHTML(tree.root)}`;
}

function saveTreeToHTML(filename, trees) {
  const html = `<!DOCTYPE HTML>
    <html>
    <head>
      <link href="styles.css" rel="stylesheet">
      <title>${trees.length === 1 ? trees[0].root.id + '\'s family tree' : 'Family tree' }</title>
    </head>
    <body>
      ${trees.map((tree)=>treeToHTML(tree)).join('\n')}
      <script type="text/javascript" src="scripts.js"></script>
    </body>
    </html>`;

  fs.writeFile( `html/${filename}.html`, html, 'utf-8', function ( err ) {
    if ( err ) {
      console.log('Failed to save :(', err);
    } else {
      console.log( html );
    }
  } );
}
function requestTreeHTML(roots) {
  return getUserInput( 'Which tree do you want to generate HTML for? (type its number or * for all)' ).then((input) => {
    if (input === '*' ) {
      saveTreeToHTML('all', roots);
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
  })
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
    3: Show orphans
    4: Show seedlings
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
        return requestTreeHTML(showIndex(roots)).then(()=>saveTreeToJSON());
      case 2:
        return updateTree(roots);
      case 3:
        trees.showOrphans();
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

  trees.getNodes().forEach((node) => {
    FIELD_BLACKLIST.forEach((field) => {
      if ( node.data[field] !== undefined ) {
        delete node.data[field];
      }
    });
    if ( node.data.dob === '0000-00-00' ) {
      delete node.data.dob;
    }
    if ( node.data.dod === '0000-00-00' ) {
      delete node.data.dod;
    }
  });
  saveTreeToJSON();
  menu();
});
