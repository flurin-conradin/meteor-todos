import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { ReactiveVar } from 'meteor/reactive-var';

import { Lists } from '../../api/lists/lists.js';

import { listRenderHold } from '../launch-screen.js';
import './lists-show-page.html';

// Components used inside the template
import './app-not-found.js';
import '../components/lists-show.js';
import { getTodos, processChange } from '../../startup/client/db.js';

const coerceToJson = value => {
  console.log(value.startsWith('{"initialLoad'));
  if (value.startsWith('{"initialLoad')) return value;
  return `[${value.replace(/}{/g, '},{')}]`;
};

Template.Lists_show_page.onCreated(function listsShowPageOnCreated() {
  this.todos = new ReactiveVar([]);
  this.getListId = () => FlowRouter.getParam('_id');

  const sub = async () => {
    const response = await fetch('https://localhost:4000/todos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // body: JSON.stringify({
      //   resumeToken:
      //     '82614711F0000000012B022C0100296E5A1004030F6E3C6A7B49CCAA8BA346D143F5F546645F6964006461470F918CB489077A9092FA0004',
      // }),
    });
    const reader = response.body
      .pipeThrough(new TextDecoderStream())
      .getReader();

    while (true) {
      const { value, done } = await reader.read();
      console.info('done', value); // never happens
      if (done) break;
      await processChange(coerceToJson(value));
      console.log('after process');
      const todos = await getTodos(FlowRouter.getParam('_id'));
      this.todos.set(todos);
    }
  };

  sub();

  this.autorun(async () => {
    const listId = this.getListId();
    const todos = await getTodos(listId);
    this.todos.set(todos);
    // this.subscribe('todos.inList', { listId:  });
  });
});

Template.Lists_show_page.onRendered(function listsShowPageOnRendered() {
  this.autorun(() => {
    if (this.subscriptionsReady()) {
      listRenderHold.release();
    }
  });
});

Template.Lists_show_page.helpers({
  // We use #each on an array of one item so that the "list" template is
  // removed and a new copy is added when changing lists, which is
  // important for animation purposes.
  listIdArray() {
    const instance = Template.instance();
    const listId = instance.getListId();
    return Lists.findOne(listId) ? [listId] : [];
  },
  listArgs(listId) {
    const instance = Template.instance();
    // By finding the list with only the `_id` field set, we don't create a dependency on the
    // `list.incompleteCount`, and avoid re-rendering the todos when it changes
    // const list = Lists.findOne(listId, { fields: { _id: true } });
    // const todos = list && list.todos();
    return {
      todosReady: instance.subscriptionsReady(),
      // We pass `list` (which contains the full list, with all fields, as a function
      // because we want to control reactivity. When you check a todo item, the
      // `list.incompleteCount` changes. If we didn't do this the entire list would
      // re-render whenever you checked an item. By isolating the reactiviy on the list
      // to the area that cares about it, we stop it from happening.
      list() {
        return Lists.findOne(listId);
      },
      todos: instance.todos.get(),
    };
  },
});
