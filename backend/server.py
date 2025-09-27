from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from authlib.integrations.starlette_client import OAuth
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from emergentintegrations.llm.chat import LlmChat, UserMessage
import secrets


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Add session middleware for OAuth
app.add_middleware(SessionMiddleware, secret_key=secrets.token_urlsafe(32))

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# OAuth setup
oauth = OAuth()
oauth.register(
    name='google',
    client_id=os.environ.get('GOOGLE_CLIENT_ID'),
    client_secret=os.environ.get('GOOGLE_CLIENT_SECRET'),
    client_kwargs={
        'scope': 'openid email profile'
    },
    server_metadata_url='https://accounts.google.com/.well-known/openid_configuration'
)

# Security
security = HTTPBearer(auto_error=False)

# User session storage (in production, use Redis or database)
user_sessions = {}

# Define Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    picture: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserProfile(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    experience: Optional[str] = None
    skills: List[str] = []
    education: Optional[str] = None
    preferred_salary: Optional[str] = None
    preferred_location: Optional[str] = None
    work_mode: Optional[str] = None  # remote, hybrid, onsite
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class JobApplication(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    company: str
    position: str
    status: str = "interested"  # interested, applied, interview, offer, rejected, ghosted
    job_url: Optional[str] = None
    salary_range: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    applied_date: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Document(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    application_id: str
    user_id: str
    type: str  # cover_letter, cold_message
    content: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Request/Response models
class JobApplicationCreate(BaseModel):
    company: str
    position: str
    status: str = "interested"
    job_url: Optional[str] = None
    salary_range: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None

class JobApplicationUpdate(BaseModel):
    company: Optional[str] = None
    position: Optional[str] = None
    status: Optional[str] = None
    job_url: Optional[str] = None
    salary_range: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None

class DocumentGenerateRequest(BaseModel):
    application_id: str
    type: str  # cover_letter, cold_message
    job_description: Optional[str] = None
    tone: str = "professional"  # professional, creative, direct

class UserProfileUpdate(BaseModel):
    experience: Optional[str] = None
    skills: Optional[List[str]] = None
    education: Optional[str] = None
    preferred_salary: Optional[str] = None
    preferred_location: Optional[str] = None
    work_mode: Optional[str] = None

# Helper functions
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = credentials.credentials
    if token not in user_sessions:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user_data = user_sessions[token]
    if user_data['expires_at'] < datetime.now(timezone.utc):
        del user_sessions[token]
        raise HTTPException(status_code=401, detail="Session expired")
    
    return user_data['user']

def prepare_for_mongo(data):
    """Prepare data for MongoDB storage"""
    if isinstance(data, dict):
        result = {}
        for key, value in data.items():
            if isinstance(value, datetime):
                result[key] = value.isoformat()
            else:
                result[key] = value
        return result
    return data

def parse_from_mongo(item):
    """Parse data from MongoDB"""
    if isinstance(item, dict) and 'created_at' in item:
        if isinstance(item['created_at'], str):
            item['created_at'] = datetime.fromisoformat(item['created_at'])
    if isinstance(item, dict) and 'updated_at' in item:
        if isinstance(item['updated_at'], str):
            item['updated_at'] = datetime.fromisoformat(item['updated_at'])
    if isinstance(item, dict) and 'applied_date' in item and item['applied_date']:
        if isinstance(item['applied_date'], str):
            item['applied_date'] = datetime.fromisoformat(item['applied_date'])
    return item

# Authentication endpoints
@api_router.get("/auth/google")
async def login_google(request: Request):
    redirect_uri = request.url_for('auth_callback')
    return await oauth.google.authorize_redirect(request, redirect_uri)

@api_router.get("/auth/callback")
async def auth_callback(request: Request):
    try:
        token = await oauth.google.authorize_access_token(request)
        user_info = token.get('userinfo')
        
        if not user_info:
            raise HTTPException(status_code=400, detail="Failed to get user info")
        
        # Check if user exists
        existing_user = await db.users.find_one({'email': user_info['email']})
        
        if not existing_user:
            # Create new user
            user_data = User(
                email=user_info['email'],
                name=user_info['name'],
                picture=user_info.get('picture')
            )
            await db.users.insert_one(prepare_for_mongo(user_data.dict()))
            user = user_data
        else:
            user = User(**parse_from_mongo(existing_user))
        
        # Create session
        session_token = str(uuid.uuid4())
        user_sessions[session_token] = {
            'user': user,
            'expires_at': datetime.now(timezone.utc) + timedelta(days=7)
        }
        
        return {
            'user': user.dict(),
            'session_token': session_token,
            'message': 'Authentication successful'
        }
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Authentication failed: {str(e)}")

@api_router.get("/auth/me")
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

@api_router.post("/auth/logout")
async def logout(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if credentials and credentials.credentials in user_sessions:
        del user_sessions[credentials.credentials]
    return {'message': 'Logged out successfully'}

# Job Applications endpoints
@api_router.get("/applications", response_model=List[JobApplication])
async def get_applications(current_user: User = Depends(get_current_user)):
    applications = await db.applications.find({'user_id': current_user.id}).to_list(1000)
    return [JobApplication(**parse_from_mongo(app)) for app in applications]

@api_router.post("/applications", response_model=JobApplication)
async def create_application(application: JobApplicationCreate, current_user: User = Depends(get_current_user)):
    app_data = application.dict()
    app_data['user_id'] = current_user.id
    
    if application.status == "applied" and not app_data.get('applied_date'):
        app_data['applied_date'] = datetime.now(timezone.utc)
    
    app_obj = JobApplication(**app_data)
    await db.applications.insert_one(prepare_for_mongo(app_obj.dict()))
    return app_obj

@api_router.put("/applications/{application_id}", response_model=JobApplication)
async def update_application(application_id: str, update_data: JobApplicationUpdate, current_user: User = Depends(get_current_user)):
    # Check if application belongs to user
    existing_app = await db.applications.find_one({'id': application_id, 'user_id': current_user.id})
    if not existing_app:
        raise HTTPException(status_code=404, detail="Application not found")
    
    update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
    update_dict['updated_at'] = datetime.now(timezone.utc)
    
    # Set applied_date if status changes to applied
    if update_data.status == "applied" and existing_app.get('status') != "applied":
        update_dict['applied_date'] = datetime.now(timezone.utc)
    
    await db.applications.update_one(
        {'id': application_id, 'user_id': current_user.id},
        {'$set': prepare_for_mongo(update_dict)}
    )
    
    updated_app = await db.applications.find_one({'id': application_id})
    return JobApplication(**parse_from_mongo(updated_app))

@api_router.delete("/applications/{application_id}")
async def delete_application(application_id: str, current_user: User = Depends(get_current_user)):
    result = await db.applications.delete_one({'id': application_id, 'user_id': current_user.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Application not found")
    return {'message': 'Application deleted successfully'}

# Document Generation endpoints
@api_router.post("/documents/generate", response_model=Document)
async def generate_document(request: DocumentGenerateRequest, current_user: User = Depends(get_current_user)):
    # Get application details
    application = await db.applications.find_one({'id': request.application_id, 'user_id': current_user.id})
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Get user profile
    profile = await db.profiles.find_one({'user_id': current_user.id})
    
    try:
        # Initialize LLM chat
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="LLM API key not configured")
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"doc_gen_{request.application_id}",
            system_message="You are an expert career coach and professional writer who creates compelling, personalized job application documents."
        ).with_model("openai", "gpt-4o")
        
        # Craft the prompt based on document type
        if request.type == "cover_letter":
            prompt = f"""
Write a professional cover letter for the following job application:

Job Details:
- Company: {application['company']}
- Position: {application['position']}
- Location: {application.get('location', 'Not specified')}
- Salary Range: {application.get('salary_range', 'Not specified')}

Applicant Information:
- Name: {current_user.name}
- Email: {current_user.email}
"""
            
            if profile:
                prompt += f"""
- Experience: {profile.get('experience', 'Not specified')}
- Skills: {', '.join(profile.get('skills', []))}
- Education: {profile.get('education', 'Not specified')}
"""
            
            if request.job_description:
                prompt += f"""

Job Description:
{request.job_description}
"""
            
            prompt += f"""

Tone: {request.tone}

Please write a compelling cover letter that:
1. Shows genuine interest in the company and role
2. Highlights relevant experience and skills
3. Demonstrates value the candidate can bring
4. Maintains a {request.tone} tone throughout
5. Is concise but impactful (3-4 paragraphs)

Return only the cover letter content, no additional commentary.
"""
        
        elif request.type == "cold_message":
            prompt = f"""
Write a professional cold outreach message for the following job opportunity:

Job Details:
- Company: {application['company']}
- Position: {application['position']}
- Location: {application.get('location', 'Not specified')}

Applicant Information:
- Name: {current_user.name}
"""
            
            if profile:
                prompt += f"""
- Experience: {profile.get('experience', 'Not specified')}
- Skills: {', '.join(profile.get('skills', []))}
"""
            
            prompt += f"""

Tone: {request.tone}

Please write a compelling LinkedIn/email message that:
1. Is personalized and shows research about the company
2. Briefly introduces the candidate's relevant background
3. Expresses genuine interest in the role
4. Requests a brief conversation or consideration
5. Maintains a {request.tone} tone
6. Is concise (2-3 short paragraphs, suitable for LinkedIn message)

Return only the message content, no additional commentary.
"""
        
        else:
            raise HTTPException(status_code=400, detail="Invalid document type")
        
        # Generate document with AI
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        # Save document to database
        document = Document(
            application_id=request.application_id,
            user_id=current_user.id,
            type=request.type,
            content=response
        )
        
        await db.documents.insert_one(prepare_for_mongo(document.dict()))
        return document
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate document: {str(e)}")

@api_router.get("/documents/{application_id}", response_model=List[Document])
async def get_documents(application_id: str, current_user: User = Depends(get_current_user)):
    documents = await db.documents.find({'application_id': application_id, 'user_id': current_user.id}).to_list(100)
    return [Document(**parse_from_mongo(doc)) for doc in documents]

# Profile endpoints
@api_router.get("/profile")
async def get_profile(current_user: User = Depends(get_current_user)):
    profile = await db.profiles.find_one({'user_id': current_user.id})
    if not profile:
        return None
    return UserProfile(**parse_from_mongo(profile))

@api_router.post("/profile", response_model=UserProfile)
async def create_or_update_profile(profile_data: UserProfileUpdate, current_user: User = Depends(get_current_user)):
    existing_profile = await db.profiles.find_one({'user_id': current_user.id})
    
    if existing_profile:
        # Update existing profile
        update_dict = {k: v for k, v in profile_data.dict().items() if v is not None}
        update_dict['updated_at'] = datetime.now(timezone.utc)
        
        await db.profiles.update_one(
            {'user_id': current_user.id},
            {'$set': prepare_for_mongo(update_dict)}
        )
        
        updated_profile = await db.profiles.find_one({'user_id': current_user.id})
        return UserProfile(**parse_from_mongo(updated_profile))
    else:
        # Create new profile
        profile_dict = profile_data.dict()
        profile_dict['user_id'] = current_user.id
        profile_obj = UserProfile(**profile_dict)
        
        await db.profiles.insert_one(prepare_for_mongo(profile_obj.dict()))
        return profile_obj

# Stats endpoint
@api_router.get("/stats")
async def get_stats(current_user: User = Depends(get_current_user)):
    applications = await db.applications.find({'user_id': current_user.id}).to_list(1000)
    
    stats = {
        'total_applications': len(applications),
        'by_status': {},
        'response_rate': 0,
        'avg_time_to_response': None
    }
    
    for app in applications:
        status = app.get('status', 'unknown')
        stats['by_status'][status] = stats['by_status'].get(status, 0) + 1
    
    # Calculate response rate (interview + offer / applied)
    applied = stats['by_status'].get('applied', 0)
    interviews = stats['by_status'].get('interview', 0)
    offers = stats['by_status'].get('offer', 0)
    
    if applied > 0:
        stats['response_rate'] = round(((interviews + offers) / applied) * 100, 1)
    
    return stats

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
