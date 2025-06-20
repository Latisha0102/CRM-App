const {initializeDatabase}  = require('./db/db.connect')
const express = require('express')
const app = express();
const mongoose = require('mongoose')

const cors = require('cors')
const Lead = require('./models/lead.model')
const Comment = require('./models/comment.model')
const SalesAgent = require('./models/salesAgent.model')
const Tag = require('./models/tag.model')

app.use(express.json())

const corsOption = {
    origin: "*",
    credential: true
}

app.use(cors(corsOption))
initializeDatabase()

app.post('/leads' , async(req, res) => {
    try{

        if (req.body.salesAgent) {
               let paddedId = req.body.salesAgent.padEnd(24, '0'); // pad to 24 chars
               req.body.salesAgent = new mongoose.Types.ObjectId(paddedId);
           }

        const newLead = new Lead(req.body)
        await newLead.save()
        res.status(201).json({message: newLead})
    }
    catch(error){
        console.error("Error creating lead:", error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            res.status(400).json({error: messages.join(', ')});
        } else {
            res.status(400).json({error: "Invalid input"});
        }
    }
})

app.get('/leads' , async(req,res) =>{
    try{
        

        const { name,source ,status, salesAgent,tags } = req.query;
       
        const query={}

        if(salesAgent){
              const agent = await SalesAgent.findOne({ name: salesAgent });
            if (agent) {
                query.salesAgent = agent._id; 
            } else {
                return res.status(404).json({ error: 'Sales agent not found' });
            }
        }
        if(status){
            query.status = status
        }
        if(name){
            query.name = name
        }
        if(source){
            query.source = source
        }
     if(tags){
        query.tags = { $in:tags.split(",")}
     }

        const searchedLeads = await Lead.find(query).populate("salesAgent")
        res.json(searchedLeads)
          if (Object.keys(query).length === 0) {
            const allLeads = await Lead.find().populate("salesAgent");
            return res.status(200).json({ data: allLeads });
        }
    }catch(error){
        res.status(400).json({error:"Invalid input: 'status' must be one of ['New', 'Contacted', 'Qualified', 'Proposal Sent', 'Closed']."})
    }
})

app.put('/leads/:id',async(req,res) =>{
    try{
        const updatedLead = await Lead.findByIdAndUpdate(req.params.id, req.body)
        res.status(200).json({message: updatedLead})
    }catch(error){
        res.status(400).json({error:  `Lead with ID ${id} not found.`})
    }
})

app.delete('/leads/:id', async(req,res) => {
    try{
        const deletedLead = await Lead.findByIdAndDelete(req.params.id)
        res.status(200).json({message: deletedLead})
    }catch(error){
        res.status(404).json({messgae: `Lead with Id ${id} not found`})
    }
})


app.post("/agents" , async(req,res) => {
    try{
        const agent = new SalesAgent(req.body)
        await agent.save()
        res.status(201).json({message: agent})
    }
    catch(error){
        console.error("Error creating agent:", error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            res.status(400).json({error: messages.join(', ')});
        } else {
            res.status(400).json({error: "Invalid input"});
        }
    }
})

app.get("/agents", async(req,res) => {
 try{
    const agents = await SalesAgent.find()
    res.status(200).json({data: agents})
 }
 catch(error){
    res.status(400).json({error: "Invalid input: 'email' must be a valid email address."})
 }
})


// Add a comment to a lead

app.post('/leads/:id/comments', async (req, res) => {
  try {
    const comment = new Comment({ ...req.body, lead: req.params.id });
    await comment.save();
    res.status(201).json(comment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get All Comments for a Lead
app.get('/leads/:id/comments', async (req, res) => {
  try {
    const comments = await Comment.find({ lead: req.params.id }).populate('author');
    res.status(200).json(comments);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});


//Reporting Api

app.get("/report/last-week", async(req,res) => {

    const lastWeekStart = new Date()
    lastWeekStart.setDate(lastWeekStart.getDate() -7 )

    const lastWeekEnd = new Date()
    lastWeekEnd.setDate(lastWeekEnd.getDate() -1)
    try{
        const leads = await Lead.find({
            status: 'Closed',
            closedAt:{
                $gte: lastWeekStart,
                $lte: lastWeekEnd
            }
        })

        const closedLeads = leads.filter((lead) => {
            const closingDate = new Date(lead.createdAt)
            closingDate.setDate(closingDate.getDate() + lead.timeToClose)
            return closingDate >= lastWeekStart && closingDate < lastWeekEnd
        })

        res.status(200).json(closedLeads)
    }
    catch(error){
        res.status(400).json({error: error.message})
    }
})

app.get('/report/pipeline', async (req, res) => {
  try {
    const totalLeadsInPipeline = await Lead.countDocuments({ status: { $ne: 'Closed' } });
    res.status(200).json({ totalLeadsInPipeline });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
    console.log("Server is running" , PORT);
})
