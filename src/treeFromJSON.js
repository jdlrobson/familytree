const fs = require( 'fs' );
const trees = require( './trees' );
const FIELD_BLACKLIST = [
  'changecount', 'type', 'tags', 'created', 'modified',
  'modifier', 'vismoxy'
];

function loadTreeFromJSON() {
  return new Promise( ( resolve ) => {
    fs.readFile( 'tree.json', 'utf-8', function ( err, text ) {
      trees.addNodes( JSON.parse( text ) );
      // Sanitize
      sanitize();
      resolve();
    } );
  } );
}

function sanitize() {
  trees.getNodes().forEach((node) => {
    FIELD_BLACKLIST.forEach((field) => {
      if ( node.data[field] !== undefined ) {
        delete node.data[field];
      }
    });
    if ( node.data.text === "Type the text for 'New Tiddler'" ) {
      delete node.data.text;
    }
    if ( node.data.dob === '0000-00-00' ) {
      delete node.data.dob;
    }
    if ( node.data.dod === '0000-00-00' ) {
      delete node.data.dod;
    }
  });
}


module.exports = loadTreeFromJSON;
