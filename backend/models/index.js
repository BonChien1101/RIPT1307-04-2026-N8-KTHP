const { DataTypes } = require('sequelize');

const sequelize = require('../config/database');

const User = sequelize.define(
  'User',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    full_name: { type: DataTypes.STRING(100), allowNull: false },
    student_code: { type: DataTypes.STRING(20), allowNull: true, unique: true },
    email: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    password: { type: DataTypes.STRING(255), allowNull: false },
    role: { type: DataTypes.ENUM('admin', 'student'), allowNull: false, defaultValue: 'student' },
    
    reset_password_otp: { 
      type: DataTypes.STRING(10), 
      allowNull: true, 
      defaultValue: null 
    },
    reset_password_expires: { 
      type: DataTypes.DATE, 
      allowNull: true, 
      defaultValue: null 
    },

    created_at: { type: DataTypes.DATE, allowNull: true },
    updated_at: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: 'users',
    timestamps: false,
  }
);
const Category = sequelize.define(
  'Category',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: 'categories',
    timestamps: false,
  }
);

const Equipment = sequelize.define(
  'Equipment',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    category: { type: DataTypes.STRING(100), allowNull: true },
    category_id: { type: DataTypes.INTEGER, allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    total_quantity: { type: DataTypes.INTEGER, allowNull: false },
    available_quantity: { type: DataTypes.INTEGER, allowNull: false },
    image_url: { type: DataTypes.STRING(255), allowNull: true },
    status: {
      type: DataTypes.ENUM('available', 'maintenance', 'unavailable'),
      allowNull: false,
      defaultValue: 'available',
    },
    created_at: { type: DataTypes.DATE, allowNull: true },
    updated_at: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: 'equipments',
    timestamps: false,
  }
);

const BorrowRequest = sequelize.define(
  'BorrowRequest',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    borrow_date: { type: DataTypes.DATEONLY, allowNull: false },
    expected_return_date: { type: DataTypes.DATEONLY, allowNull: false },
    actual_return_date: { type: DataTypes.DATEONLY, allowNull: true },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected', 'returned', 'overdue', 'lost', 'damaged'),
      allowNull: false,
      defaultValue: 'pending',
    },
    approved_by: { type: DataTypes.INTEGER, allowNull: true },
    note: { type: DataTypes.TEXT, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: true },
    updated_at: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: 'borrow_requests',
    timestamps: false,
  }
);

const BorrowItem = sequelize.define(
  'BorrowItem',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    request_id: { type: DataTypes.INTEGER, allowNull: false },
    equipment_id: { type: DataTypes.INTEGER, allowNull: false },
    quantity: { type: DataTypes.INTEGER, allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: 'borrow_items',
    timestamps: false,
  }
);

const Notification = sequelize.define(
  'Notification',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    title: { type: DataTypes.STRING(255), allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false },
    is_read: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: false },
    created_at: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: 'notifications',
    timestamps: false,
  }
);

const Role = sequelize.define(
  'Role',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: 'roles',
    timestamps: false,
  }
);

const Permission = sequelize.define(
  'Permission',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(150), allowNull: false, unique: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: 'permissions',
    timestamps: false,
  }
);

const UserRole = sequelize.define(
  'UserRole',
  {
    user_id: { type: DataTypes.INTEGER, primaryKey: true },
    role_id: { type: DataTypes.INTEGER, primaryKey: true },
    assigned_by: { type: DataTypes.INTEGER, allowNull: true },
    assigned_at: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: 'user_roles',
    timestamps: false,
  }
);

const RolePermission = sequelize.define(
  'RolePermission',
  {
    role_id: { type: DataTypes.INTEGER, primaryKey: true },
    permission_id: { type: DataTypes.INTEGER, primaryKey: true },
  },
  {
    tableName: 'role_permissions',
    timestamps: false,
  }
);

const EquipmentImage = sequelize.define(
  'EquipmentImage',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    equipment_id: { type: DataTypes.INTEGER, allowNull: false },
    url: { type: DataTypes.STRING(255), allowNull: false },
    is_primary: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: false },
    created_at: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: 'equipment_images',
    timestamps: false,
  }
);

const EquipmentQrCode = sequelize.define(
  'EquipmentQrCode',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    equipment_id: { type: DataTypes.INTEGER, allowNull: false },
    qr_code: { type: DataTypes.TEXT, allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: 'equipment_qr_codes',
    timestamps: false,
  }
);

const Return = sequelize.define(
  'Return',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    borrow_item_id: { type: DataTypes.INTEGER, allowNull: false },
    returned_by: { type: DataTypes.INTEGER, allowNull: false },
    returned_at: { type: DataTypes.DATE, allowNull: true },
    condition: { type: DataTypes.ENUM('good', 'damaged', 'lost'), allowNull: true, defaultValue: 'good' },
    damage_fee: { type: DataTypes.DECIMAL(10, 2), allowNull: true, defaultValue: 0 },
    processed_by: { type: DataTypes.INTEGER, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    tableName: 'returns',
    timestamps: false,
  }
);

const Penalty = sequelize.define(
  'Penalty',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    borrow_request_id: { type: DataTypes.INTEGER, allowNull: true },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    reason: { type: DataTypes.STRING(255), allowNull: true },
    paid: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: false },
    created_at: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: 'penalties',
    timestamps: false,
  }
);

const ActivityLog = sequelize.define(
  'ActivityLog',
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    user_id: { type: DataTypes.INTEGER, allowNull: true },
    action: { type: DataTypes.STRING(150), allowNull: false },
    details: { type: DataTypes.TEXT, allowNull: true },
    ip_address: { type: DataTypes.STRING(45), allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: 'activity_logs',
    timestamps: false,
  }
);

User.hasMany(BorrowRequest, { foreignKey: 'user_id', as: 'borrowRequests' });
BorrowRequest.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(BorrowRequest, { foreignKey: 'approved_by', as: 'approvedBorrowRequests' });
BorrowRequest.belongsTo(User, { foreignKey: 'approved_by', as: 'approver' });

BorrowRequest.hasMany(BorrowItem, { foreignKey: 'request_id', as: 'items' });
BorrowItem.belongsTo(BorrowRequest, { foreignKey: 'request_id', as: 'request' });

Equipment.hasMany(BorrowItem, { foreignKey: 'equipment_id', as: 'borrowItems' });
BorrowItem.belongsTo(Equipment, { foreignKey: 'equipment_id', as: 'equipment' });

User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Category.hasMany(Equipment, { foreignKey: 'category_id', as: 'equipments' });
Equipment.belongsTo(Category, { foreignKey: 'category_id', as: 'categoryDetail' });

Equipment.hasMany(EquipmentImage, { foreignKey: 'equipment_id', as: 'images' });
EquipmentImage.belongsTo(Equipment, { foreignKey: 'equipment_id', as: 'equipment' });

Equipment.hasMany(EquipmentQrCode, { foreignKey: 'equipment_id', as: 'qrCodes' });
EquipmentQrCode.belongsTo(Equipment, { foreignKey: 'equipment_id', as: 'equipment' });

BorrowItem.hasOne(Return, { foreignKey: 'borrow_item_id', as: 'returnRecord' });
Return.belongsTo(BorrowItem, { foreignKey: 'borrow_item_id', as: 'borrowItem' });

User.hasMany(Return, { foreignKey: 'returned_by', as: 'returnsMade' });
Return.belongsTo(User, { foreignKey: 'returned_by', as: 'returnedByUser' });
User.hasMany(Return, { foreignKey: 'processed_by', as: 'returnsProcessed' });
Return.belongsTo(User, { foreignKey: 'processed_by', as: 'processedByUser' });

User.hasMany(Penalty, { foreignKey: 'user_id', as: 'penalties' });
Penalty.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

BorrowRequest.hasMany(Penalty, { foreignKey: 'borrow_request_id', as: 'penalties' });
Penalty.belongsTo(BorrowRequest, { foreignKey: 'borrow_request_id', as: 'borrowRequest' });

User.hasMany(ActivityLog, { foreignKey: 'user_id', as: 'activityLogs' });
ActivityLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.belongsToMany(Role, { through: UserRole, foreignKey: 'user_id', otherKey: 'role_id', as: 'roles' });
Role.belongsToMany(User, { through: UserRole, foreignKey: 'role_id', otherKey: 'user_id', as: 'users' });

Role.belongsToMany(Permission, {
  through: RolePermission,
  foreignKey: 'role_id',
  otherKey: 'permission_id',
  as: 'permissions',
});
Permission.belongsToMany(Role, {
  through: RolePermission,
  foreignKey: 'permission_id',
  otherKey: 'role_id',
  as: 'roles',
});

module.exports = {
  sequelize,
  User,
  Equipment,
  BorrowRequest,
  BorrowItem,
  Notification,
  Category,
  Role,
  Permission,
  UserRole,
  RolePermission,
  EquipmentImage,
  EquipmentQrCode,
  Return,
  Penalty,
  ActivityLog,
};
