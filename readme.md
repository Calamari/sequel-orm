# SequelORM

Extensible and powerful MySQL object-relational mapper with the right amout of ease-of-use.

## Quickstart guide
This should give you a short overview over some of the most used features of SequelORM and how it can be used.

### Connecting to a database
Creating a database connection is as easy as:

    var Seq  = require('sequel_orm');
    var db = new Seq.create({
      user:     'theuser',
      password: 'password',
      database: 'database_name'
    });

But the real connection will be done as soon as the first sql will be made.

### Creating a table
A table for a migration can be done like the following example:

    var dataTypes = SequelORM.dataTypes;
    db.createTable('products', function(table) {
      table.addColumn('title', dataTypes.VARCHAR({ length: 122 }));
      table.addColumn('dueDate', dataTypes.DATETIME());
      table.addColumn('numberThings', dataTypes.INT());
      table.addColumn('price', dataTypes.FLOAT());
      table.addColumn('active', dataTypes.BOOLEAN({ default: true }));
      table.addColumn('description',dataTypes.TEXT());
      table.addTimestamps(); // this adds a created_at and updated_at column to the table
    }, function(err) {
      if (err) throw err;
      // Here the table is already created
    });

Every predefined data type can has the following parameters: length (integer), default (String|Object), required (boolean), validation (Function|Array[function]).
The addTimestamps method will add two columns to the table which will be automatically filled when item is saved and is updated.

### Defining a model
Defining a model can be done in different ways. The easiest ist the following one:

    var Product = Seq.defineModel('Product', {
      title: Seq.dataTypes.VARCHAR({ length: 122 }),
      price: Seq.dataTypes.INT(),
      createdAt: Seq.dataTypes.DATETIME(),
      updatedAt: Seq.dataTypes.DATETIME()
    });

In this method we are explicit what attributes the defined model will have. Another way of doing the same is to defined it through a migration on the SequelORM object.

    SequelORM.createTable('products', function(table) {
      table.addColumn('title', dataTypes.VARCHAR({ length: 122 }));
      table.addColumn('price', dataTypes.FLOAT());
      table.addTimestamps(); // this adds a created_at and updated_at column to the table
    });
    var Product = SequelORM.defineModel('Product', SequelORM.getTableFromMigration('products'));

Calling createTable on the SequelORM object directly will not do anything on the database and therefore runs synchronously and does not need a callback method.

The thrid parameter of the defineModel method is an object which can take one or more of the following keys:

- *instanceMethods:* Methods that can be directly called on every instanciated Record object
- *classMethods:* Methods that can be called on the Model object itself
- *hooks:* Methods that will be called on several points in the lifetime of an object. (See the hooks section below for more information.)

Wanna an example? Take this:

    var Product = SequelORM.defineModel('Product', SequelORM.getTableFromMigration('products'), {
      instanceMethods: {
        doublePrice: function() {
          this.price *= 2;
        }
      },
      classMethods: {
        findCheapProducts: function(cb) {
          this.findAll({ where: 'products.price < 5' }, cb);
        }
      },
      hooks: {
        afterLoad: function() {
          this.price += 5;
        },
        afterChange: function(key, value) {
          if (key === 'title') {
            this.title = 'Awesome product:' + this.title;
          }
        }
      }
    });


### Adapting save and load methods of DataTypes

You could also change the actual stored data in the database using the save option of any data type. And also change the data loaded from the database. It will take the value that is to save as parameter and expects the value that should be stored as return value. The following example should make this clear:

    var Product = Seq.defineModel('Product', {
      title: Seq.dataTypes.VARCHAR({ save: function(val) { return 'Project: ' + val; } })
    });

Saving an instance of this class will always save a title prepended with 'Project :'.

There is also an option for loading for values available. Which is similar to the save options:

    var Product = Seq.defineModel('Product', {
      title: Seq.dataTypes.VARCHAR({
        save: function(val) { return 'Project: ' + val; },
        load: function(val) { return val.replace('Project: ', ''); }
      })
    });

In this example the title of every product will have 'Product: ' prepended in the database, but if you load it again, you will have the original value restored.

### Creating great middleware with hooks
There are two types of hooks: *model hooks* which will be defined on the model itself and are called on every instance of this model and *instance hooks* which will only be defined on that instance just like an EventEmitter.

#### Model hooks:
The following model hooks are available:

- *afterCreate(data):* Called directly after a new record was created (not loaded from db). First parameter is object with defined data.
- *afterLoad(data):* Called after a record was loaded from db. First parameter is object with loaded data for this record.
- *beforeChange(key, value):* Called before an property of the instance is changed.
- *afterChange(key, value):* Called directly after an property of the instance is changed.
- *beforeValidate():* Called before the instance gets validated. (Usually directly before save.)
- *afterValidate(isValidated):* Called after all validators of instance has been run. First parameter is a boolean telling if the validations did run successfully or not.
- *beforeSave():* Called before an record gets saved into db.
- *afterSave():* Called before an record did get saved successfully into db.

#### Instance hooks:
At the moment there is only one instance hook available:

- *save:* called after record was saved into db

Instance hooks are used like a typical Node.js EventEmitter. So the methods on, once, removeListener, etc. are all available.

    var Thing  = SequelORM.getModel('Thing'),
        myFunc = function() { console.log('Yeah this was saved', this); };
    Thing.on('save', myFunc);
    Thing.removeListener('save', myFunc);

### Using the models

You can find element from the database like that:

    var person = Person.find(3); // find with id
    // with where clause, and limit returning an array of projects
    var projects = Project.findAll({ where: 'title LIKE ?', limit: 5, offset: 10 }, 'create%');
    // creates a query like SELECT * FROM projects WHERE title LIKE 'create%' LIMIT 10,5

### Creating a series of migration files
A simple example of doing a migration:

    module.exports = {
      up: function(db, next) {
        db.createTable('users', function(table) {
          // table definition here...
        }, next);
      },
      down: function(db, next) {
        db.dropTable('users', next);
      }
    };

You only need then a script, that goes through all your migration files and then calling either the up or down method on the SequelORM instance you created (or on the base class, for generating migration and not doing things on the database).

### Associations
The association concept is pretty much the same as in [the Active Records of Ruby on Rails](http://guides.rubyonrails.org/association_basics.html). But at the moment much more basic. The aim of this lib is to implement all that is useful in Active Record in this lib, too. At the moment that's creating hasOne, hasMany and belongsTo associations. If you create an association it will be named after the name of the associated model by default, but it is also possible to give them different names using the name option.

#### HasOne and BelongsTo Associations
A hasOne and belongsTo association can be defined like the following example:

    // create the tables
    Seq.createTable('things', function(table) {
      table.addColumn('name', Seq.dataTypes.VARCHAR());
      table.addBelongsToColumn('item');
    });
    Seq.createTable('items', function(table) {
      table.addColumn('name', Seq.dataTypes.VARCHAR());
    });
    // define the models with a one to one association:
    var Thing = Seq.defineModel('Thing', Seq.getTableFromMigration('things'));
    var Item  = Seq.defineModel('Item', Seq.getTableFromMigration('items'));
    Item.hasOne(Thing);
    Thing.belongsTo(Item);

Please note that the column for the association is defined in the model where belongsTo is defined on. If a model is not yet defined, you can define it as String and the association will be initialized when the model is defined. In this way, you have no problem splitting the model definitions in different files.

    // (In one file:)
    var Thing = Seq.defineModel('Thing', Seq.getTableFromMigration('things'));
    Thing.belongsTo('Item');
    // and sometime later (maybe in another file):
    var Item  = Seq.defineModel('Item', Seq.getTableFromMigration('items'));
    Item.hasOne('Thing');

Doing this, you can then do the following things. Setting and Getting the things on an item and on a thing:

    var thing1 = Thing.create({ name: "one" }),
        thing2 = Thing.create({ name: "two" }),
        item   = Item.create({ name: "an item" });
    item.setThing(thing1); // also possible: item.thing = thing1;
    item.getThing(function(err, theThing) { /* do stuff here */ });
    item.removeThing();

If you want to save the item, make sure that you will save the associated objects first, else save will callback with error: `AssociationsNotSavedError`.

#### Differently named HasOne and BelongsTo Associations

Just let this example speak for itself:

    // create the tables
    Seq.createTable('persons', function(table) {
      table.addColumn('name', Seq.dataTypes.VARCHAR());
      table.addBelongsToColumn('person', { name: 'father' });
      table.addBelongsToColumn('person', { name: 'mother' });
    });
    // define the models with a one to one association:
    var Person = Seq.defineModel('Person', Seq.getTableFromMigration('persons'));
    Person.hasMany(Person, { name: 'children' });
    Person.belongsTo(Person, { name: 'father' });
    Person.belongsTo(Person, { name: 'mother' });

This lets you then do this:

    var mum = Person.create({ 'Jane' }),
        dad = Person.create({ 'John' }),
        son = Person.create({ 'Joey' });
    son.setFather(dad);
    son.setMother(mum);
    ...

## Things that might be interesting

It uses the [node_mysql](https://github.com/felixge/node-mysql) module by [Felix Geisendörfer](https://github.com/felixge).


## Things that are still ToDo:

### v0.2:
- Readme: explain validation, updateAttributes
- Add different types of typical validations to this
- Maybe: Add unique validation
- saving of multiple items at once
(- dont mark things as dirty if orignal state is met again)
- dont save assocs that are already saved
- TableMigrator should be able to create syncs and replace TableCreator and TableUpdater
- through associations
- associations with autosave?
- Check association validation before saving? (after previous one)
- Item.getThings({ where: 'id>3', limit: 5 }, cb) should work
- Extract functionality for singular pluralize words and make them attributes, ids, or whatever
- association validation
- Thing.findAll({ where: 'things.id<=2' },... Think about adding table name automatically for inputs??
- Save multiple records at once Record.save([r1, r2, r3])
- create Validation Class out of validators
- after/before/aroundDestroy hook

### later:
- another possibility to access things like: Item.find(1).include('things').run(function(err, item) {}); + .success and .fail callbacks
- Rails like touch: true/false on columns for updateing updated_at column on save
- findEach method like in rails: http://guides.rubyonrails.org/active_record_querying.html
- Post.comments.push({ text: "bla" }) should create a Comment and push it to Post as commetns (e.g. Post.addComments(Comment.create({ text: "bla" })))
- get and validate hook, as second type of hooks?
- create docs
- destroyAll method
- table.hasOne('OtherThing')
- COMMENTS in data types
- ZEROFILL numbers in data types
- autoincrement in database
- Database name inflection plural/singular using a dictionary
- transactions
- addTimestamps method accepts options to only set one of both
- Caching mechanism?
