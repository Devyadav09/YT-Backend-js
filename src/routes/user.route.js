import { Router } from "express";
import { loginUser, logoutUser, registerUser, refereshAccessToken, changeCurrentPassword, getCurrentUser, updateAccountDetails } from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middlewares.js"
import { verifyJWT } from "../middlewares/auth.middlewares.js";


const router = Router()

router.route("/register").post(upload.fields([
    {
        name: "avatar",
        maxCount: 1
    },
    {
        name: "coverImage",
        maxCount:1
    }
]),registerUser)


router.route("/login").post(loginUser)

//secured route
router.route("/logout").post(verifyJWT, logoutUser)
router.route("refresh-token").post(refereshAccessToken)
router.route("/change-password").post(verifyJWT, changeCurrentPassword)
router.route("/current-user").get(verifyJWT, getCurrentUser)
router.route("/update-account").get(verifyJWT, updateAccountDetails)




export default router;
