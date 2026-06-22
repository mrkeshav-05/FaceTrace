import SightingReport from '../models/reportMissing.model.js';
import MissingPerson from '../models/findMissing.model.js';
import { uploadToCloudinary } from '../config/cloudinary.js';
import ApiResponse from '../utils/apiResponse.js';
import mongoose from 'mongoose';
import User from '../models/user.model.js';
import { createNotification, createGlobalNotification } from './notification.controller.js';

export const createSightingReport = async (req, res) => {
    try {
        const { name, description, location } = req.body;
        // console.log('req.body:', req.body);
        // console.log("req.files:", req.files);

        // Validate required fields
        if (!location) {
            return ApiResponse.error(res, {
                statusCode: 400,
                message: 'Location is required',
            });
        }

        // Upload photos
        const photos = await Promise.all(
            req.files.map((file) => uploadToCloudinary(file.buffer)),
        );

        // console.log("first photo:", photos[0]);
        // console.log("photos:", photos);

        // Create report
        const report = await SightingReport.create({
            name: name || 'Unknown',
            reportedBy: req.user.id,
            photos: photos,
            description,
            location,
            timestamp: new Date(),
        });

        // console.log('report:', report);
        const user = await User.findById(req.user.id);
        user.reportedCases.push(report._id);
        await user.save();

        // Create a notification for the user
        await createNotification(
            req.user.id,
            'SIGHTING_REPORT',
            'Sighting Report Created',
            `Your sighting report for ${name || 'Unknown person'} at ${location} has been submitted successfully.`,
            report._id,
            'SightingReport',
            report.photos[0]
        );

        // Global notifications are disabled for new listings

        return ApiResponse.success(res, {
            status: 201,
            message: 'Sighting report created successfully',
            data: report,
        });
    } catch (error) {
        console.error('Create sighting error:', error);
        return ApiResponse.error(res, {
            statusCode: 500,
            message: 'Server Error',
            error: error.message,
        });
    }
};

export const getSightingReports = async (req, res) => {
    try {
        const { status, personId } = req.query;
        const filter = {};

        if (status) filter.status = status;
        if (personId) filter.person = personId;

        const reports = await SightingReport.find(filter)
            .populate('person', 'name age photos')
            .populate('reportedBy', 'name role')
            .sort({ timestamp: -1 });

        return ApiResponse.success(res, {
            statusCode: 200,
            message: 'Sighting reports retrieved successfully',
            data: reports,
        });
    } catch (error) {
        console.error('Get reports error:', error);
        return ApiResponse.error(res, {
            statusCode: 500,
            message: 'Server Error',
            error: error.message,
        });
    }
};

export const getSightingReportById = async (req, res) => {
    try {
        // Get ID from either params (GET /:id) or body (POST /matches)
        const reportId = req.params.id || req.body.id;

        if (!reportId) {
            return ApiResponse.error(res, {
                statusCode: 400,
                message: 'Report ID is required'
            });
        }

        // Validate that the ID is a valid MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(reportId)) {
            return ApiResponse.error(res, {
                statusCode: 400,
                message: 'Invalid report ID format'
            });
        }

        const report = await SightingReport.findById(reportId)
            .populate('reportedBy', 'username fullname');

        if (!report) {
            return ApiResponse.error(res, {
                statusCode: 404,
                message: 'Report not found'
            });
        }

        return ApiResponse.success(res, {
            statusCode: 200,
            message: 'Sighting report retrieved successfully',
            data: report
        });

    } catch (error) {
        console.error('Get report error:', error);
        return ApiResponse.error(res, {
            statusCode: 500,
            message: 'Server Error',
            error: error.message
        });
    }
};

export const getSightingReportByIds = async (req, res) => {
    try {
        const { sightingReportIds } = req.body; // Expecting an array of sighting report IDs

        if (!sightingReportIds || !Array.isArray(sightingReportIds)) {
            return ApiResponse.error(res, {
                statusCode: 400,
                message:
                    'Invalid input: Expected an array of sighting report IDs',
            });
        }

        const validObjectIds = sightingReportIds
            .filter((id) => mongoose.Types.ObjectId.isValid(id))
            .map((id) => new mongoose.Types.ObjectId(id));

        if (validObjectIds.length === 0) {
            return ApiResponse.error(res, {
                statusCode: 400,
                message: 'No valid sighting report IDs provided',
            });
        }

        const reports = await SightingReport.find({
            _id: { $in: validObjectIds },
        });

        return ApiResponse.success(res, {
            statusCode: 200,
            message: 'Sighting report',
            data: reports,
        });
    } catch (error) {
        console.error('Get report error:', error);
        return ApiResponse.error(res, {
            statusCode: 500,
            message: 'Server Error',
            error: error.message,
        });
    }
};

export const getSightingReportsByUserId = async (req, res) => {
    try {
        const reports = await SightingReport.find({
            reportedBy: req.user.id,
        }).sort({ timestamp: -1 });

        return ApiResponse.success(res, {statusCode: 200, message: 'Sighting reports retrieved successfully', data: reports});
    } catch (error) {
        console.error('Get reports error:', error);
        return ApiResponse.error(res, {statusCode: 500, message: 'Server Error'});
    }
};

export const updateSightingStatus = async (req, res) => {
    try {
        const { status, verificationNotes } = req.body;

        if (!['pending', 'verified', 'rejected'].includes(status)) {
            return ApiResponse.error(res, {
                statusCode: 400,
                message: 'Invalid status',
            });
        }

        const report = await SightingReport.findByIdAndUpdate(
            req.params.id,
            {
                status,
                verificationNotes,
                $set: { verifiedBy: req.user.id },
            },
            { new: true, runValidators: true },
        ).populate('reportedBy', '_id');

        if (!report) {
            return ApiResponse.error(res, {
                statusCode: 404,
                message: 'Report not found',
            });
        }

        // Create notification for the person who reported the sighting
        if (report.reportedBy) {
            let notificationTitle = '';
            let notificationMessage = '';

            if (status === 'verified') {
                notificationTitle = 'Sighting Report Verified';
                notificationMessage = `Your sighting report at ${report.location} has been verified.`;
            } else if (status === 'rejected') {
                notificationTitle = 'Sighting Report Rejected';
                notificationMessage = `Your sighting report at ${report.location} has been rejected.`;
            }

            if (notificationTitle) {
                await createNotification(
                    report.reportedBy._id,
                    'STATUS_UPDATE',
                    notificationTitle,
                    notificationMessage,
                    report._id,
                    'SightingReport',
                    report.photos[0]
                );
            }
        }

        // Global notifications are kept for verification status updates as they're important for all users
        if (status === 'verified') {
            await createGlobalNotification(
                'MATCH_FOUND',
                'Sighting Report Verified',
                `A sighting report at ${report.location} has been verified.`,
                report._id,
                'SightingReport',
                report.photos[0]
            );
        }

        return ApiResponse.success(res, {
            statusCode: 200,
            message: 'Status updated',
            data: report,
        });
    } catch (error) {
        console.error('Update status error:', error);
        return ApiResponse.error(res, {
            statusCode: 500,
            message: 'Server Error',
            error: error.message,
        });
    }
};
