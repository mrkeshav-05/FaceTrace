import MissingPerson from '../models/findMissing.model.js';
import { uploadToCloudinary } from '../config/cloudinary.js';
import ApiResponse from '../utils/apiResponse.js';
import mongoose from 'mongoose';
import User from '../models/user.model.js';
import { createNotification, createGlobalNotification } from './notification.controller.js';

export const createMissingPerson = async (req, res) => {
    try {
        const { name, age, gender, missingDate, lastSeenLocation } = req.body;
        // console.log(req.body);
        // console.log(req.files);

        // Step 1: Validate required fields BEFORE uploading images
        if (!name || !age || !gender || !missingDate || !lastSeenLocation) {
            return ApiResponse.error(res, {
                statusCode: 400,
                message: 'All fields are required',
            });
        }

        if (!req.files || req.files.length === 0) {
            return ApiResponse.error(res, {
                statusCode: 400,
                message: 'At least one photo is required',
            });
        }

        // console.log('req.body:', req.body);
        // console.log('req.files:', req.files);

        // Step 2: Upload images only if validation passes
        const uploadPromises = req.files.map((file) =>
            uploadToCloudinary(file.buffer, file.mimetype.split('/')[1]),
        );

        const cloudinaryResults = await Promise.all(uploadPromises);
        // console.log('cloudinaryResults:', cloudinaryResults);

        // Step 3: Save missing person record in the database
        const missingPerson = await MissingPerson.create({
            name,
            age,
            gender,
            missingDate,
            lastSeenLocation,
            photos: cloudinaryResults, // Use URLs returned from Cloudinary
            reportedBy: req.user.id,
        });

        const user = await User.findById(req.user.id);
        user.missingCases.push(missingPerson._id);
        await user.save();

        // Create a notification for the user
        await createNotification(
            req.user.id,
            'MISSING_PERSON',
            'Missing Person Report Created',
            `Your report for ${name} has been submitted successfully.`,
            missingPerson._id,
            'MissingPerson',
            missingPerson.photos[0]
        );

        // Global notifications are disabled for new listings

        return ApiResponse.success(res, {
            status: 201,
            message: 'Missing person report created successfully',
            data: missingPerson,
        });
    } catch (error) {
        console.error('Error creating missing person:', error);
        return ApiResponse.error(res, {
            statusCode: 500,
            message: 'Server Error',
            error: error.message,
        });
    }
};

export const searchMissingPersons = async (req, res) => {
    try {
        // Basic search implementation (customize as needed)
        const { name, age } = req.query;
        const query = { status: 'missing' };

        if (name) query.name = { $regex: name, $options: 'i' };
        if (age) query.age = age;

        const results = await MissingPerson.find(query)
            .populate('reportedBy', 'name phone')
            .sort({ missingDate: -1 });

        return ApiResponse.success(res, {
            status: 200,
            message: 'Search results',
            data: results,
        });
    } catch (error) {
        console.error('Search error:', error);
        return ApiResponse.error(res, {
            statusCode: 500,
            message: 'Server Error',
            error: error.message,
        });
    }
};

export const getAllMissingPersons = async (req, res) => {
    try {
        const { status } = req.query;
        const query = {};

        // Filter by status if provided
        if (status) {
            query.status = status;
        }

        const missingPersons = await MissingPerson.find(query)
            .populate('reportedBy', 'username fullname')
            .sort({ createdAt: -1 });

        return ApiResponse.success(res, {
            statusCode: 200,
            message: 'All missing persons retrieved successfully',
            data: missingPersons,
        });
    } catch (error) {
        console.error('Error fetching all missing persons:', error);
        return ApiResponse.error(res, {
            statusCode: 500,
            message: 'Server Error',
            error: error.message
        });
    }
};

export const getMissingPersonsByUserId = async (req, res) => {
    try {
        const missingPersons = await MissingPerson.find({
            reportedBy: req.user._id,
        }).sort({ missingDate: -1 });

        return ApiResponse.success(res, {
            status: 200,
            message: 'Missing persons retrieved successfully',
            data: missingPersons,
        });
    } catch (error) {
        console.error('Error fetching missing persons:', error);
        return ApiResponse.error(res, {
            statusCode: 500,
            message: 'Server Error',
            error: error.message,
        });
    }
}

export const getMissingPersonById = async (req, res) => {
    try {
        const id = req.params.id;

        // Validate that the ID is a valid MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            console.error('Invalid ID format:', id);
            return ApiResponse.error(res, {
                statusCode: 400,
                message: 'Invalid ID format'
            });
        }

        const person = await MissingPerson.findById(id)
            .populate('reportedBy', 'username fullname');

        if (!person) {
            return ApiResponse.error(res, {
                statusCode: 404,
                message: 'Missing person not found'
            });
        }

        return ApiResponse.success(res, {
            status: 200,
            message: 'Missing person retrieved successfully',
            data: person,
        });
    } catch (error) {
        console.error('Error fetching missing person:', error);
        return ApiResponse.error(res, {
            statusCode: 500,
            message: 'Server Error',
            error: error.message
        });
    }
}



export const getMissingPersonByIds = async (req, res) => {
    try {
        // Expecting the frontend to send { ids: [id1, id2, id3, ...] }
        const { ids } = req.body;

        // Validate that ids exist and is an array
        if (!ids || !Array.isArray(ids)) {
          return ApiResponse.error(res, {
            statusCode: 400,
            message: 'Invalid input: expected an array of IDs',
          });
        }

        // Filter out invalid MongoDB ObjectIds
        const validIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id));
        if (validIds.length === 0) {
          return ApiResponse.error(res, {
            statusCode: 400,
            message: 'No valid IDs provided',
          });
        }

        // Query the MissingPerson collection for documents with these IDs
        const missingPersons = await MissingPerson.find({
          _id: { $in: validIds },
        });

        return ApiResponse.success(res, {
          statusCode: 200,
          message: 'Missing persons retrieved successfully',
          data: missingPersons,
        });
      } catch (error) {
        console.error('Error fetching missing persons:', error);
        return ApiResponse.error(res, {
          statusCode: 500,
          message: 'Server error',
          error: error.message,
        });
      }
};

export const updateMissingPersonStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const id = req.params.id;

        // Validate that the ID is a valid MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            console.error('Invalid ID format:', id);
            return ApiResponse.error(res, {
                statusCode: 400,
                message: 'Invalid ID format'
            });
        }

        const person = await MissingPerson.findByIdAndUpdate(
            id,
            { status },
            { new: true, runValidators: true },
        ).populate('reportedBy', '_id');

        if (!person) {
            return ApiResponse.error(res, {
                statusCode: 404,
                message: 'Missing person not found'
            });
        }

        // Create notification for the person who reported the missing person
        if (status === 'found' && person.reportedBy) {
            await createNotification(
                person.reportedBy._id,
                'STATUS_UPDATE',
                'Missing Person Status Updated',
                `${person.name} has been marked as found.`,
                person._id,
                'MissingPerson',
                person.photos[0]
            );

            // Global notifications are kept for status updates as they're important for all users
            await createGlobalNotification(
                'STATUS_UPDATE',
                'Missing Person Found',
                `${person.name}, previously reported missing, has been found.`,
                person._id,
                'MissingPerson',
                person.photos[0]
            );
        }

        return ApiResponse.success(res, {
            status: 200,
            message: 'Status updated',
            data: person
        });
    } catch (error) {
        console.error('Status update error:', error);
        return ApiResponse.error(res, {
            statusCode: 500,
            message: 'Server Error',
            error: error.message
        });
    }
};
