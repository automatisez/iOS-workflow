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
    let alert = createAlertDialog("Erreur", "Erreur. Verifiez que votre compte par défault pour les contacts est bien iCloud.", "OK")
    alert.present();
  });
}

  
function confirmDeleteGroup(group) {
  let alert = new Alert();
  
  alert.title = "Confirmation";
  alert.message = `Vous aller supprimer le groupe de contacts "${ group.name }".`;
  
  alert.addDestructiveAction("Supprimer le groupe");
  alert.addCancelAction("Annuler");
    
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
