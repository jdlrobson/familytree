const fs = require( 'fs' );
const trees = require( './trees' );
const FIELD_RENDER_BLACKLIST = [
  'father', 'mother', 'title', 'sex', 'spouse', 'text'
];

function getAllChildren(node) {
  if ( node.data.sex === 'F' ) {
    if ( node.data.spouse ) {
      const spouses = node.data.spouse.split(',');
      let children = [];
      spouses.forEach((spouse) => {
        const spouseNode = trees.findNodeInTrees(spouse);
        if ( spouseNode && spouseNode.children ) {
          children = children.concat( spouseNode.children );
        }
      });
      return children;
    } else {
      return [];
    }
  } else {
    return node.children.sort((child, child2) => child.data.dob < child2.data.dob ? -1 : 1 );
  }
}

function date(str) {
  if ( !str ) {
    return '??';
  } else {
    // dates in format 2018-02-20
    str = str.replace(/-/g, '');
    // dates in format 2018/20/02
    str = str.replace(/\//g, '');
    const y = str.substr(0, 4);
    const m = str.substr(6, 2);
    const d = str.substr(8, 2);

    return y != '0000' ? y : '??';
  }
}

function fragment(id) {
  return encodeURIComponent(id.replace(/ /g, '_' ));
}

function href(id) {
  const p = path(id);
  if ( p ) {
    return `href="${p}"`;
  } else {
    return '';
  }
}

function path(id) {
  const needle = trees.findNodeAndTree(id);
  if ( needle ) {
    const path = needle.tree.root.id;
    const depth = trees.getDepth( needle.tree.root );
    return trees.getDepth( needle.tree.root ) > 0 ? `${path}.html#${fragment(id)}` : '';
  } else {
    return '';
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
`<div class="person person--${modifierClass}">
  <div class="person__content">
    <h3 class="person__heading" id="${fragment(node.id)}">${node.id} (${date(data.dob)}-${date(data.dod)})</h3>
    <p class="person__text">${node.data.text}</p>
    ${dl(data)}
`;
  const children = getAllChildren(node);
  partners.forEach((partner) => {
    html += `<p class="person__spouse">Children with <a ${href(partner)}>${partner}</a></p>
    `;
    const theirChildren = children.filter((node)=>node.data.mother === partner || node.data.father === partner);
    if ( theirChildren.length ) {
      html += '<div class="person__children">';
      theirChildren.forEach((child) => {
        html += generateHTML(child, depth+1);
      });
    } else {
       html += '<div class="person__children--none">';
       html += 'No children';
    }
    html += '</div>';
  });
  if ( !partners.length ) {
    html += '<div class="person__partner--none">No partner</div>';
  }

  const unaccountedChildren = children.filter((node)=>!node.data.mother || !node.data.father);
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

module.exports = saveTreeToHTML;
