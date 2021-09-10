// create a reference to the notifications list in the bottom of the app; we will write database messages into this list by
//appending list items on to the inner HTML of this variable - this is all the lines that say note.innerHTML += '<li>foo</li>';
// const note = document.getElementById("notifications");

// create an instance of a db object for us to store the IDB data in
export let db;

// Let us open our database
const DBOpenRequest = window.indexedDB.open('todosDb', 1);

// Gecko-only IndexedDB temp storage option:
// var request = window.indexedDB.open("toDoList", {version: 4, storage: "temporary"});

// these two event handlers act on the database being opened successfully, or not
DBOpenRequest.onerror = function (event) {
  console.log('DBOpenRequest.onerror', event.error);
};

DBOpenRequest.onsuccess = function (event) {
  // console.log('DBOpenRequest.onsuccess');

  // store the result of opening the database in the db variable. This is used a lot below
  db = window._db = DBOpenRequest.result;
};

// This event handles the event whereby a new version of the database needs to be created
// Either one has not been created before, or a new version number has been submitted via the
// window.indexedDB.open line above
//it is only implemented in recent browsers
DBOpenRequest.onupgradeneeded = function (event) {
  console.log('onupgradeneeded');
  let db = event.target.result;

  db.onerror = function (event) {
    console.log('onupgradeneeded', event.error);
  };

  // Create an objectStore for this database

  let objectStore = db.createObjectStore('todos', {
    keyPath: '_id',
  });

  // define what data items the objectStore will contain

  objectStore.createIndex('listId', 'listId', { unique: false });
  // objectStore.createIndex("minutes", "minutes", { unique: false });
  // objectStore.createIndex("day", "day", { unique: false });
  // objectStore.createIndex("month", "month", { unique: false });
  // objectStore.createIndex("year", "year", { unique: false });

  // objectStore.createIndex("notified", "notified", { unique: false });

  console.log('object store created');
};

export function getTodos(listId) {
  // console.log('listId', listId);
  // Open our object store and then get a cursor list of all the different data items in the IDB to iterate through
  let objectStore = db
    .transaction('todos')
    .objectStore('todos')
    .index('listId');
  let data = [];
  let resolve;
  let p = new Promise((_resolve, _reject) => {
    resolve = _resolve;
  });
  objectStore.openCursor(listId).onsuccess = function (event) {
    let cursor = event.target.result;
    // if there is still another cursor to go, keep runing this code
    if (cursor) {
      // create a list item to put each data item inside when displaying it
      data.push(cursor.value);
      // put the item item inside the task list
      // continue on to the next item in the cursor
      cursor.continue();
      // if there are no more cursor items to iterate through, say so, and exit the function
    } else {
      resolve(data);
      console.log('all entries here', data);
    }
  };
  console.log('return');
  return p;
}

// give the form submit button an event listener so that when the form is submitted the addData() function is run
//taskForm.addEventListener("submit", addData, false);

export function processChange(data) {
  return new Promise(async (resolve, reject) => {
    const d = JSON.parse(data);
    if (d.operationType == 'insert') {
      await addData(d.fullDocument);
    }
    resolve();
  });
}

function addData(item) {
  // prevent default - we don't want the form to submit in the conventional way
  // e.preventDefault();

  // open a read/write db transaction, ready for adding the data
  let transaction = db.transaction(['todos'], 'readwrite');

  // report on the success of the transaction completing, when everything is done
  transaction.oncomplete = function () {
    console.log('transaction complete');
  };

  transaction.onerror = function () {
    console.log('transation error');
  };

  // call an object store that's already been added to the database
  let objectStore = transaction.objectStore('todos');
  // console.log(objectStore.indexNames);
  // console.log(objectStore.keyPath);
  // console.log(objectStore.name);
  // console.log(objectStore.transaction);
  // console.log(objectStore.autoIncrement);

  // Make a request to add our newItem object to the object store
  return new Promise((resolve, reject) => {
    let objectStoreRequest = objectStore.add(item);
    objectStoreRequest.onsuccess = function (event) {
      resolve();
    };
  });
}

function deleteItem(event) {
  // retrieve the name of the task we want to delete
  let dataTask = event.target.getAttribute('data-task');

  // open a database transaction and delete the task, finding it by the name we retrieved above
  let transaction = db.transaction(['toDoList'], 'readwrite');
  let request = transaction.objectStore('toDoList').delete(dataTask);

  // report that the data item has been deleted
  transaction.oncomplete = function () {
    // delete the parent of the button, which is the list item, so it no longer is displayed
    event.target.parentNode.parentNode.removeChild(event.target.parentNode);
    note.innerHTML += '<li>Task "' + dataTask + '" deleted.</li>';
  };
}
