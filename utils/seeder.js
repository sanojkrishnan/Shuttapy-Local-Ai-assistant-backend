const User = require("../models/User");
const config = require("../config/config");
const logger = require("../utils/logger");
const Product = require("../models/Product");
const Category = require("../models/Category");
const productDocs = require("../dev/productData");
const categoryDocs = require("../dev/categoryData");
const couponDocs = require("../dev/couponData");
const Coupon = require("../models/Coupon");

const seedAdmin = async () => {
  try {
    const adminEmail = config.ADMIN_EMAIL || "admin123@omnimall.com";
    const existingAdmin = await User.findByEmail(adminEmail);

    if (!existingAdmin) {
      const admin = new User({
        name: "Admin",
        email: adminEmail,
        password: config.ADMIN_PASS || "admin123",
        role: "admin",
        status: "active",
      });

      await admin.save();
      logger.info(`Admin user created with email: ${adminEmail}`);
    } else {
      logger.info("Admin user already exists");
    }
  } catch (error) {
    logger.error("Error seeding admin user:", error);
  }
};

//sample user seeding only if the app is under development
const seedSampleUsers = async () => {
  try {
    if (config.NODE_ENV !== "development") {
      return;
    }

    const sampleUsers = [
      {
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        password: "password123",
        role: "user",
        gender: "male",
        dateOfBirth: new Date("1990-01-01"),
        status: "active",
      },
      {
        firstName: "Jane",
        lastName: "Smith",
        email: "jane@example.com",
        password: "password123",
        role: "seller",
        gender: "female",
        dateOfBirth: new Date("1992-05-15"),
        status: "active",
      },
      {
        firstName: "Bob",
        lastName: "Johnson",
        email: "bob@example.com",
        password: "password123",
        role: "seller",
        gender: "male",
        dateOfBirth: new Date("1990-01-01"),
        status: "banned",
      },
    ];

    for (const userData of sampleUsers) {
      const existingUser = await User.findByEmail(userData.email);
      if (!existingUser) {
        const user = new User(userData);
        await user.save();
        logger.info(`Sample user created: ${userData.email}`);
      }
    }
  } catch (error) {
    logger.error("Error seeding sample users:", error);
  }
};

const seedSampleCategories = async () => {
  try {
    if (config.NODE_ENV !== "development") return;

    const sampleCategories = categoryDocs;

    const createdCategories = {};

    for (const catData of sampleCategories) {
      let category = await Category.findOne({ name: catData.name });
      if (!category) {
        category = new Category(catData);
        await category.save();
        logger.info(`Sample category created: ${catData.name}`);
      }
      createdCategories[catData.name] = category._id; // store real ObjectId
    }

    return createdCategories;
  } catch (error) {
    logger.error("Error seeding sample categories:", error);
  }
};

// product seeding
const seedSampleProducts = async () => {
  try {
    if (config.NODE_ENV !== "development") return;

    // sellers check
    const sellers = await User.find({ role: "seller" });
    if (sellers.length === 0) {
      logger.warn("No sellers found, skipping product seeding");
      return;
    }

    // categories check — now outside the sellers block
    const categoriesList = await Category.find({});
    if (categoriesList.length === 0) {
      logger.warn("No categories found, skipping product seeding");
      return;
    }

    const categories = {};
    categoriesList.forEach((cat) => {
      categories[cat.name] = cat._id;
    });

    const seller1 = sellers[0]._id;
    const seller2 = sellers[1]?._id || sellers[0]._id;
    const seller3 = sellers[2]?._id || sellers[0]._id;

    const sampleProducts = productDocs;

    for (const product of sampleProducts) {
      const existingProduct = await Product.findOne({
        sellerId: product.sellerId,
        productName: product.productName,
      });
      if (!existingProduct) {
        const newProduct = new Product(product);
        await newProduct.save();
        logger.info(`Sample product created: ${product.productName}`);
      }
    }
  } catch (error) {
    logger.error("Error seeding sample products:", error);
  }
};

const seedSampleCoupon = async () => {
  try {
    if (config.NODE_ENV !== "development") return;

    const sampleCoupon = couponDocs;

    const createdCoupons = {};

    for (const couponData of sampleCoupon) {
      let coupon = await Coupon.findOne({ name: couponData.name });
      if (!coupon) {
        coupon = new Coupon(couponData);
        await coupon.save();
        logger.info(`Sample coupon created: ${couponData.name}`);
      }
      createdCoupons[couponData.name] = coupon._id; // store real ObjectId
    }

    return createdCoupons;
  } catch (error) {
    logger.error("Error seeding sample coupons:", error);
  }
};

const runSeeders = async () => {
  try {
    await seedAdmin();
    await seedSampleUsers();
    await seedSampleCategories();
    await seedSampleProducts();
    await seedSampleCoupon();
    logger.info("Database seeding completed");
  } catch (error) {
    logger.error("Database seeding failed:", error);
  }
};

module.exports = {
  runSeeders,
  seedAdmin,
  seedSampleUsers,
  seedSampleCategories,
  seedSampleProducts,
  seedSampleCoupon,
};
