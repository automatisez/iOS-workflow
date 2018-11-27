let text = {

  'error': {
    'fr-FR': "Erreur",
    '*':     "Error"
  },

  'error.isDefaultICloud': {
    'fr-FR': `Erreur. Verifiez que votre compte par défault pour les contacts est bien iCloud.`,
    '*':     `Error. Please check default contact account is iCloud.`
  },
  
  
  'confirmDelete.title': {
    'fr-FR': "Confirmation",
    '*':     "Please Confirm"
  },
  'confirmDelete.message': {
    'fr-FR': 'Vous aller supprimer le groupe de contacts « %0 ».',
    '*':     'You are going to delete the group of contacts named "%0".'
  },
  'confirmDelete.action.confirm': {
    'fr-FR': "Supprimer le groupe",
    '*':     "Delete group"
  },

  'ok': {
    'fr-FR': "OK",
    '*':     "OK"
  },
  'cancel': {
    'fr-FR': "Annuler",
    '*':     "Cancel"
  },


  
  // Use this as a template for localization
  '__': {
    'fr-FR': "",
    '*':     ""
  }
};

// ===== UI UTILITIES

Object.prototype.i18n = function (key) {
  let langs = Device.preferredLanguages();
  langs.push('*');
  
  if ( 'undefined' === typeof this[key] ) {
    console.log(`Missing key ${key}`);
    Script.complete();
  }
  
  let msg;
  while ( 'undefined' === typeof msg && (langs.length > 0) ) {
    msg = this[key][langs.shift()];
  }
  
  return msg;
};


  
function createAlertDialog(title, message, cancelLabel) {
  let dialog = new Alert();
  
  dialog.title = title;
  dialog.message = message;
  
  dialog.addCancelAction(cancelLabel);
  
  return dialog;
}


function deleteGroup(group) {
  ContactsGroup.delete(group);
  
  Contact.persistChanges()
  .then((data) => {
    console.log(`Group ${ group.name } successfully deleted.`);
  })
  .catch((error) => {
    console.log(`Failed to delete group ${error}`);
    let alert = createAlertDialog(text.i18n('error'), text.i18n('error.isDefaultICloud'), text.i18n('ok'));
    alert.present();
  });
}

  
function confirmDeleteGroup(group) {
  let alert = new Alert();
  
  alert.title = text.i18n('confirmDelete.title');
  alert.message = text.i18n('confirmDelete.message').replace('%0', group.name);
  
  alert.addDestructiveAction(text.i18n('confirmDelete.action.confirm'));
  alert.addCancelAction(text.i18n('cancel'));
    
  alert.presentAlert()
  .then((response) => {
    if ( -1 != response ) {
      deleteGroup(group);
    }
  });

}
  
  
function contactDisplayName(contact) {
  let name = null;
  
  if ( contact.familyName ) {
    name = contact.familyName;
    if ( contact.givenName ) {
      name = name + ' ' + contact.givenName;
    }
  }
  
  return name;
}
  
async function createGroupRow(group) { 
  let row = new UITableRow();
  row.height = 50;

  let members = await Contact.inGroups([group]);
  
  let nameCell = UITableCell.text(group.name);
  nameCell.leftAligned();
  
  let countCell = UITableCell.text(`${ members.length } contacts`)
  countCell.rightAligned();
  
  row.addCell(nameCell);
  row.addCell(countCell);

  row.onSelect = (number) => {
    confirmDeleteGroup(group);
  }
  
  return row;
}

async function createGroupTable(groups) {
  let table = new UITable();
  
  for ( group of groups ) {
    let row = await createGroupRow(group);
    table.addRow(row);
  }
  
  return table;
}

function orderGroups(groups) {
  groups.sort(
    (g1, g2) => { return g1.name.localeCompare(g2.name); }
  );
  
  return groups;
}


let container = await ContactsContainer.default();
let allGroups = await ContactsGroup.all([container]);
let orderedGroups = orderGroups(allGroups);
let groupTable = await createGroupTable(orderedGroups);

groupTable.present();
